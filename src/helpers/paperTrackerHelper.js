// Paper tracker helpers.
//
// A project can carry a "paper plan": a list of sections, each with
//   - a manual word target and the words written so far, and/or
//   - a list of concepts (the conceptual draft: ideas the section must cover,
//     ticked off as they get written),
// stored on the project record as `paper = { sections: [...], file: "" }`.
//
// Everything about progress is pure and works in the browser too. Reading a
// manuscript from disk (to sync the written word counts) is optional, only
// happens when the user clicks the button, and needs Electron's `fs`.

import isElectron from "is-electron";

// ---------------------------------------------------------------- ids/plan

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function newSection(name, target) {
  return { id: newId(), name: name || "", target: target || null, words: 0, concepts: [] };
}

const TEMPLATES = {
  article: [
    ["Abstract", 250],
    ["Introduction", 800],
    ["Methods", 1000],
    ["Results", 1500],
    ["Discussion", 1000],
    ["Conclusions", 300],
  ],
  computational: [
    ["Abstract", 250],
    ["Introduction", 900],
    ["Computational details", 800],
    ["Results and discussion", 2500],
    ["Conclusions", 300],
  ],
};

function templateSections(key) {
  return (TEMPLATES[key] || []).map((row) => newSection(row[0], row[1]));
}

// ---------------------------------------------------------------- progress

function num(v) {
  let n = Number(v);
  return isFinite(n) && n > 0 ? n : 0;
}

// Progress of one section, 0-100 each part. A section can be tracked by
// words, by concepts or by both; the overall percentage is the average of the
// parts that exist (a section with neither counts as "not tracked").
function sectionProgress(section) {
  let target = num(section && section.target);
  let words = num(section && section.words);
  let concepts = (section && section.concepts) || [];
  let conceptsTotal = concepts.length;
  let conceptsDone = concepts.filter((c) => c && c.done).length;
  let parts = [];
  let wordsPct = null;
  let conceptsPct = null;
  if (target > 0) {
    wordsPct = Math.min(100, Math.round((words / target) * 100));
    parts.push(wordsPct);
  }
  if (conceptsTotal > 0) {
    conceptsPct = Math.round((conceptsDone / conceptsTotal) * 100);
    parts.push(conceptsPct);
  }
  let pct = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
  return {
    pct: pct,
    wordsPct: wordsPct,
    conceptsPct: conceptsPct,
    words: words,
    target: target,
    remaining: target > 0 ? Math.max(0, target - words) : null,
    conceptsDone: conceptsDone,
    conceptsTotal: conceptsTotal,
  };
}

// Totals for the whole paper. `pct` is null when nothing is trackable yet.
function totals(paper) {
  let sections = (paper && paper.sections) || [];
  let words = 0;
  let target = 0;
  let conceptsDone = 0;
  let conceptsTotal = 0;
  let pcts = [];
  sections.forEach((s) => {
    let p = sectionProgress(s);
    words += p.words;
    target += p.target;
    conceptsDone += p.conceptsDone;
    conceptsTotal += p.conceptsTotal;
    if (p.pct !== null) pcts.push(p.pct);
  });
  return {
    sections: sections.length,
    words: words,
    target: target,
    conceptsDone: conceptsDone,
    conceptsTotal: conceptsTotal,
    pct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
  };
}

function barColor(pct) {
  if (pct === null || pct === undefined) return "#9ca3af";
  if (pct >= 100) return "#10b981";
  if (pct >= 66) return "var(--accent-color, #5e6ef2)";
  if (pct >= 33) return "#f59e0b";
  return "#9ca3af";
}

// ---------------------------------------------------------------- counting

// Latin letters with accents (covers English, Spanish, Catalan, French...).
const L = "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F";
const WORD_RE = new RegExp("[" + L + "0-9]+(?:['\u2019\\-\u00B7][" + L + "0-9]+)*", "g");
const HAS_LETTER_RE = new RegExp("[" + L + "]");

// Words: runs of letters/digits, allowing inner hyphens, apostrophes and the
// Catalan middle dot ("state-of-the-art", "don't", "col\u00B7lecci\u00F3" are one
// word each, like a word processor counts them). Tokens made only of digits
// are not words.
function wordCount(text) {
  let tokens = String(text || "").match(WORD_RE) || [];
  let n = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (HAS_LETTER_RE.test(tokens[i])) n++;
  }
  return n;
}

function stripLatexComments(text) {
  return String(text || "").replace(/(^|[^\\])%.*$/gm, "$1");
}

const NON_PROSE_ENVS = [
  "equation", "align", "alignat", "gather", "multline", "eqnarray", "displaymath", "math",
  "figure", "table", "tabular", "tabularx", "longtable", "lstlisting", "verbatim", "minted",
  "thebibliography", "comment", "tikzpicture", "algorithm", "algorithmic",
];

// Plain prose out of a LaTeX fragment. A gauge, not a submission tool.
function stripLatex(text) {
  let s = String(text || "");
  NON_PROSE_ENVS.forEach((env) => {
    let re = new RegExp("\\\\begin\\{" + env + "\\*?\\}[\\s\\S]*?\\\\end\\{" + env + "\\*?\\}", "g");
    s = s.replace(re, " ");
  });
  s = s.replace(/\\\$/g, " ");
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
  s = s.replace(/\$[^$]*\$/g, " ");
  s = s.replace(/\\\[[\s\S]*?\\\]/g, " ");
  s = s.replace(/\\\([\s\S]*?\\\)/g, " ");
  // Commands whose argument is not prose at all.
  s = s.replace(
    /\\(?:cite[a-zA-Z]*|[a-zA-Z]*ref|label|includegraphics|usepackage|documentclass|bibliography|bibliographystyle|input|include|vspace|hspace|url|href|newcommand|renewcommand|setlength|pagestyle|thispagestyle)\*?\s*(?:\[[^\]]*\]\s*)*\{[^{}]*\}/g,
    " "
  );
  // Any other command: keep the text inside its braces (\textbf{x} -> x).
  // A few passes so nested ones (\emph{\textbf{x}}) resolve too.
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\[a-zA-Z@]+\*?\s*(?:\[[^\]]*\]\s*)*\{([^{}]*)\}/g, " $1 ");
  }
  s = s.replace(/\\[a-zA-Z@]+\*?/g, " ");
  s = s.replace(/\\[\\,;:!&%#_{} ]/g, " ");
  s = s.replace(/[{}~]/g, " ");
  return s;
}

function stripMarkdown(text) {
  let s = String(text || "");
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, " "); // YAML front matter
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/~~~[\s\S]*?~~~/g, " ");
  s = s.replace(/`[^`]*`/g, " ");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
  s = s.replace(/\$[^$\n]*\$/g, " ");
  s = s.replace(/^[ ]{0,3}#{1,6}[ \t]*/gm, "");
  s = s.replace(/[*_~>|]/g, " ");
  return s;
}

// Reads "{...}" starting at index `i` (which must point at "{"), honouring
// nested braces. Returns { text, end } or null.
function readBraced(text, i) {
  if (text[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    let ch = text[j];
    if (ch === "\\") {
      j++;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return { text: text.slice(i + 1, j), end: j + 1 };
    }
  }
  return null;
}

const HEADING_RE = /\\(chapter|section|subsection|subsubsection)(\*?)\s*(\[[^\]]*\])?\s*(?=\{)/g;
const LEVELS = { chapter: 0, section: 1, subsection: 2, subsubsection: 3 };

// Splits a text into headings and the prose that follows each one, then
// returns every heading with the words it owns, INCLUDING its sub-headings
// (so "Methods" counts its subsections too).
//   headings: [{ title, level, start, end }]  (positions of the heading command)
function splitSections(text, headings, strip) {
  let segments = [];
  let front = text.slice(0, headings.length ? headings[0].start : text.length);
  for (let i = 0; i < headings.length; i++) {
    let from = headings[i].end;
    let to = i + 1 < headings.length ? headings[i + 1].start : text.length;
    segments.push(wordCount(strip(text.slice(from, to))));
  }
  let out = headings.map((h, i) => {
    let words = segments[i];
    for (let j = i + 1; j < headings.length && headings[j].level > h.level; j++) words += segments[j];
    return { name: h.title, level: h.level, words: words };
  });
  return { front: wordCount(strip(front)), sections: out };
}

function latexHeadings(text) {
  let out = [];
  HEADING_RE.lastIndex = 0;
  let m;
  while ((m = HEADING_RE.exec(text))) {
    let braced = readBraced(text, HEADING_RE.lastIndex);
    if (!braced) continue;
    let title = stripLatex(braced.text).replace(/\s+/g, " ").trim() || braced.text.trim();
    out.push({ title: title, level: LEVELS[m[1]], start: m.index, end: braced.end });
    HEADING_RE.lastIndex = braced.end;
  }
  return out;
}

function markdownHeadings(text) {
  let out = [];
  let re = /^[ ]{0,3}(#{1,3})[ \t]+(.+?)[ \t#]*$/gm;
  let m;
  while ((m = re.exec(text))) {
    out.push({ title: m[2].trim(), level: m[1].length, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

// ---------------------------------------------------------------- disk

function nodeFs() {
  if (!isElectron()) return null;
  try {
    return require("fs");
  } catch (e) {
    return null;
  }
}

function nodePath() {
  if (!isElectron()) return null;
  try {
    return require("path");
  } catch (e) {
    return null;
  }
}

function isManuscriptName(name) {
  return /\.(tex|md)$/i.test(name);
}

// Inlines \input / \include / \subfile (relative to the including file, up to a
// few levels, no loops) so a paper split into one file per section counts
// correctly. Returns { text, files } where files is the list of files read.
function readLatexTree(fs, path, file, depth, seen) {
  let raw = fs.readFileSync(file, "utf8");
  let text = stripLatexComments(raw);
  let files = [file];
  if (depth >= 6) return { text: text, files: files };
  let dir = path.dirname(file);
  let missing = [];
  text = text.replace(/\\(?:input|include|subfile)\s*\{([^}]+)\}/g, (all, name) => {
    let rel = name.trim();
    if (!/\.[a-zA-Z0-9]+$/.test(rel)) rel += ".tex";
    let full = path.resolve(dir, rel);
    if (seen.has(full)) return " ";
    try {
      seen.add(full);
      let sub = readLatexTree(fs, path, full, depth + 1, seen);
      files = files.concat(sub.files);
      missing = missing.concat(sub.missing || []);
      return "\n" + sub.text + "\n";
    } catch (e) {
      missing.push(rel);
      return " ";
    }
  });
  return { text: text, files: files, missing: missing };
}

// ---------------------------------------------------------------- matching

function normalizeName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Looser key used as a second chance: singular/plural and the usual short forms.
function looseKey(name) {
  let n = normalizeName(name);
  n = n.replace(/\bintro\b/g, "introduction").replace(/\bconclusions\b/g, "conclusion");
  n = n.replace(/\bmethodology\b/g, "methods").replace(/\bmethod\b/g, "methods");
  return n;
}

// Pairs each planned section with the best detected heading. Exact name first,
// then loose key, then containment (both ways, at least 4 characters). Every
// detected heading is used at most once. Returns
// { matches: { sectionId: detected }, unmatchedPlan: [section], unmatchedFile: [detected] }.
function matchSections(planSections, detected) {
  let free = detected.slice();
  let matches = {};
  let pending = (planSections || []).slice();
  let passes = [
    (a, b) => normalizeName(a) === normalizeName(b),
    (a, b) => looseKey(a) === looseKey(b),
    (a, b) => {
      let x = looseKey(a);
      let y = looseKey(b);
      return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x));
    },
  ];
  passes.forEach((same) => {
    pending = pending.filter((sec) => {
      // Prefer the shallowest heading when several fit.
      let best = -1;
      for (let i = 0; i < free.length; i++) {
        if (!same(sec.name, free[i].name)) continue;
        if (best === -1 || free[i].level < free[best].level) best = i;
      }
      if (best === -1) return true;
      matches[sec.id] = free[best];
      free.splice(best, 1);
      return false;
    });
  });
  return { matches: matches, unmatchedPlan: pending, unmatchedFile: free };
}

// ---------------------------------------------------------------- API

export default {
  newId: newId,
  newSection: newSection,
  templateSections: templateSections,
  sectionProgress: sectionProgress,
  totals: totals,
  barColor: barColor,
  wordCount: wordCount,
  normalizeName: normalizeName,
  matchSections: matchSections,

  // Pure parsers, exported so they can be tested without a disk.
  analyseLatex: function (text) {
    let clean = stripLatexComments(text);
    let doc = clean.match(/\\begin\{document\}([\s\S]*?)(?:\\end\{document\}|$)/);
    let body = doc ? doc[1] : clean;
    // \begin{abstract} counts as its own section.
    body = body.replace(/\\begin\{abstract\}/g, "\n\\section{Abstract}\n").replace(/\\end\{abstract\}/g, "\n");
    let parts = splitSections(body, latexHeadings(body), stripLatex);
    return { kind: "tex", words: wordCount(stripLatex(body)), sections: parts.sections };
  },
  analyseMarkdown: function (text) {
    let body = String(text || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    let parts = splitSections(body, markdownHeadings(body), stripMarkdown);
    return { kind: "md", words: wordCount(stripMarkdown(body)), sections: parts.sections };
  },

  // True when files can be read (desktop app). The rest of the tracker works
  // without it.
  canReadFiles: function () {
    return !!(nodeFs() && nodePath());
  },

  // Names of the .tex / .md files directly inside a folder; [] on any problem.
  listFiles: function (folderPath) {
    let fs = nodeFs();
    if (!fs || !folderPath) return [];
    try {
      return fs
        .readdirSync(folderPath, { withFileTypes: true })
        .filter((e) => e.isFile() && isManuscriptName(e.name))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
    } catch (e) {
      return [];
    }
  },

  // Best default choice for the file picker (only a suggestion: the user
  // always confirms it). null when there is nothing convincing.
  suggestFile: function (files) {
    let preferred = ["main", "manuscript", "paper", "article", "draft", "ms"];
    for (let i = 0; i < preferred.length; i++) {
      let hit = (files || []).find((f) => f.toLowerCase().replace(/\.(tex|md)$/i, "") === preferred[i]);
      if (hit) return hit;
    }
    return null;
  },

  // Reads and analyses one manuscript. Resolves nothing asynchronous on
  // purpose: it is a user-triggered action on a single file.
  // Returns { ok: true, filename, kind, words, sections, files, missing }
  // or { ok: false, error } with error in: "no-fs" | "no-file" | "read".
  analyseFile: function (folderPath, filename) {
    let fs = nodeFs();
    let path = nodePath();
    if (!fs || !path) return { ok: false, error: "no-fs" };
    if (!folderPath || !filename) return { ok: false, error: "no-file" };
    let full = path.join(folderPath, filename);
    try {
      if (/\.tex$/i.test(filename)) {
        let tree = readLatexTree(fs, path, full, 0, new Set([path.resolve(full)]));
        let res = this.analyseLatex(tree.text);
        return Object.assign(res, {
          ok: true,
          filename: filename,
          files: tree.files.map((f) => path.basename(f)),
          missing: tree.missing || [],
        });
      }
      let res = this.analyseMarkdown(fs.readFileSync(full, "utf8"));
      return Object.assign(res, { ok: true, filename: filename, files: [filename], missing: [] });
    } catch (e) {
      return { ok: false, error: "read" };
    }
  },
};
