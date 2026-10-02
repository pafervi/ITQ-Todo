// Paper tracker: when a project is linked to a folder containing a .tex or
// .md manuscript, read it from disk and report word count + per-section
// progress. Electron-only (needs `fs`); in the browser build the helper
// returns null for everything so the UI just hides.

import isElectron from "is-electron";

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

// Pick the "main" manuscript file in a folder: prefer anything named
// main.* / manuscript.* / paper.* / article.*, else the biggest .tex, else
// the biggest .md. Returns an absolute path or null.
function findMainFile(folderPath) {
  let fs = nodeFs();
  let path = nodePath();
  if (!fs || !path || !folderPath) return null;
  let entries;
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch (e) {
    return null;
  }
  let candidates = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => /\.(tex|md)$/i.test(n));
  if (!candidates.length) return null;

  const preferred = ["main", "manuscript", "paper", "article", "draft"];
  for (let pref of preferred) {
    let m = candidates.find((n) => n.toLowerCase().startsWith(pref + "."));
    if (m) return path.join(folderPath, m);
  }
  // Largest .tex wins, else largest .md
  let tex = candidates.filter((n) => /\.tex$/i.test(n));
  let md = candidates.filter((n) => /\.md$/i.test(n));
  let pool = tex.length ? tex : md;
  pool.sort((a, b) => {
    let sa = 0, sb = 0;
    try { sa = fs.statSync(path.join(folderPath, a)).size; } catch (e) { /* ignore */ }
    try { sb = fs.statSync(path.join(folderPath, b)).size; } catch (e) { /* ignore */ }
    return sb - sa;
  });
  return path.join(folderPath, pool[0]);
}

// Strip LaTeX commands/environments for a word count that approximates what
// a journal counts. Not perfect — intentional, this is a progress gauge, not
// a submission tool.
function stripLatex(text) {
  let s = String(text || "");
  // Comments
  s = s.replace(/(^|[^\\])%.*$/gm, "$1");
  // Common environments that aren't prose: equation, align, figure, table,
  // tabular, lstlisting, verbatim, bibliography.
  const kill = ["equation", "equation\\*", "align", "align\\*", "gather", "gather\\*",
                "figure", "figure\\*", "table", "table\\*", "tabular", "lstlisting",
                "verbatim", "thebibliography", "comment"];
  kill.forEach((env) => {
    let re = new RegExp("\\\\begin\\{" + env + "\\}[\\s\\S]*?\\\\end\\{" + env + "\\}", "g");
    s = s.replace(re, " ");
  });
  // Inline math
  s = s.replace(/\$[^$]*\$/g, " ");
  s = s.replace(/\\\([^]*?\\\)/g, " ");
  // Citations and refs — the key is one token each.
  s = s.replace(/\\(cite|ref|eqref|citep|citet|citeauthor|citeyear)\s*\{[^}]*\}/g, " cite ");
  // Any remaining command: drop command, keep braced argument contents.
  s = s.replace(/\\[a-zA-Z@]+\s*(\[[^\]]*\])?\s*\{([^{}]*)\}/g, " $2 ");
  // Lone commands without args
  s = s.replace(/\\[a-zA-Z@]+/g, " ");
  // Leftover braces
  s = s.replace(/[{}]/g, " ");
  return s;
}

function stripMarkdown(text) {
  let s = String(text || "");
  // Code fences
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Inline code
  s = s.replace(/`[^`]*`/g, " ");
  // Links [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, " ");
  // Headings markers
  s = s.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  // Emphasis / strong / strikethrough markers
  s = s.replace(/[*_~]{1,3}/g, "");
  return s;
}

function wordCount(text) {
  if (!text) return 0;
  // Split on non-letter/digit chars; count tokens with at least one letter.
  let tokens = String(text).split(/[^A-Za-zÀ-ÿ0-9]+/).filter(Boolean);
  return tokens.filter((t) => /[A-Za-zÀ-ÿ]/.test(t)).length;
}

// Detect sections and count words per section. Returns an ordered list of
// { name, words }.
function sectionsLatex(text) {
  const sectRe = /\\(section|subsection|chapter)\*?\s*\{([^}]+)\}/g;
  let out = [];
  let last = { name: "Preamble", start: 0 };
  let m;
  while ((m = sectRe.exec(text))) {
    last.end = m.index;
    out.push(last);
    last = { name: m[2].trim(), start: m.index + m[0].length };
  }
  last.end = text.length;
  out.push(last);
  return out.map((sec) => {
    let chunk = text.slice(sec.start, sec.end);
    return { name: sec.name, words: wordCount(stripLatex(chunk)) };
  }).filter((s) => s.name !== "Preamble" || s.words > 20);
}

function sectionsMarkdown(text) {
  const headRe = /^\s{0,3}(#{1,3})\s+(.+)$/gm;
  let out = [];
  let last = { name: "Opening", start: 0 };
  let m;
  while ((m = headRe.exec(text))) {
    last.end = m.index;
    out.push(last);
    last = { name: m[2].trim(), start: m.index + m[0].length };
  }
  last.end = text.length;
  out.push(last);
  return out.map((sec) => {
    let chunk = text.slice(sec.start, sec.end);
    return { name: sec.name, words: wordCount(stripMarkdown(chunk)) };
  }).filter((s) => s.name !== "Opening" || s.words > 20);
}

export default {
  // Returns { file, filename, kind, words, sections, mtimeMs } or null if the
  // folder has no .tex/.md, or when we're not in Electron.
  statFor(folderPath) {
    let fs = nodeFs();
    let path = nodePath();
    if (!fs || !path || !folderPath) return null;
    let file = findMainFile(folderPath);
    if (!file) return null;
    let raw;
    let mtimeMs = 0;
    try {
      raw = fs.readFileSync(file, "utf8");
      mtimeMs = fs.statSync(file).mtimeMs;
    } catch (e) {
      return null;
    }
    let kind = /\.tex$/i.test(file) ? "tex" : "md";
    let words = kind === "tex" ? wordCount(stripLatex(raw)) : wordCount(stripMarkdown(raw));
    let sections = kind === "tex" ? sectionsLatex(raw) : sectionsMarkdown(raw);
    return {
      file: file,
      filename: path.basename(file),
      kind: kind,
      words: words,
      sections: sections,
      mtimeMs: mtimeMs,
    };
  },
};
