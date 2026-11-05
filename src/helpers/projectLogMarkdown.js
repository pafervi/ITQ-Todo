import moment from "moment";

// Markdown export of a phased project: Gantt (as a Mermaid block plus a plain
// table) and the log feed, written to be pasted or uploaded as context for an
// LLM project or a report. Pure functions, no store or DOM access, so it can be
// unit-tested. Output is always English so the headings stay predictable.

const KIND_LABEL = { note: "note", milestone: "milestone", decision: "decision", block: "block" };
const SNAPSHOT_LABEL = { monday: "Monday open", friday: "Friday close" };
const STATUS_ORDER = ["done", "active", "blocked", "pending"];

function validDate(value) {
  let m = moment(value, "YYYY-MM-DD", true);
  return m.isValid() ? m : null;
}

// Mermaid uses ":" "#" and ";" as syntax, so strip them from free text.
function mermaidText(text) {
  return String(text || "")
    .replace(/[:#;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Escape the pipe so a phase name cannot break the table.
function cell(text) {
  return String(text || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

// Multi-line entry text: continuation lines are indented to stay inside the list item.
function indentLines(text) {
  return String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join("\n");
}

function daysInclusive(start, end) {
  return end.diff(start, "days") + 1;
}

function sortedPhases(phases) {
  return (phases || [])
    .slice()
    .sort((a, b) => {
      let oa = typeof a.order === "number" ? a.order : 0;
      let ob = typeof b.order === "number" ? b.order : 0;
      if (oa !== ob) return oa - ob;
      return String(a.startDate).localeCompare(String(b.startDate));
    });
}

function sortedEntries(entries) {
  // Chronological (oldest first) so the log reads as a story. Array index
  // breaks ties so same-day entries keep the order they were written in.
  return (entries || [])
    .map((e, i) => ({ e: e, i: i }))
    .sort((a, b) => {
      let c = String(a.e.date).localeCompare(String(b.e.date));
      return c !== 0 ? c : a.i - b.i;
    })
    .map((x) => x.e);
}

function periodLine(project, phases, now) {
  let start = validDate(project && project.startDate);
  let end = validDate(project && project.endDate);
  if (!start || !end) {
    let ps = phases.map((p) => validDate(p.startDate)).filter(Boolean);
    let pe = phases.map((p) => validDate(p.endDate)).filter(Boolean);
    if (!start && ps.length) start = moment.min(ps);
    if (!end && pe.length) end = moment.max(pe);
  }
  if (!start || !end) return null;
  let total = daysInclusive(start, end);
  let text = start.format("YYYY-MM-DD") + " to " + end.format("YYYY-MM-DD") + " (" + total + " days";
  if (now.isBefore(start, "day")) text += ", not started";
  else if (now.isAfter(end, "day")) text += ", ended";
  else {
    let elapsed = daysInclusive(start, now);
    text += ", day " + elapsed + ", " + Math.round((elapsed / total) * 100) + "%";
  }
  return text + ")";
}

function countBy(list, keyFn) {
  let out = {};
  list.forEach((x) => {
    let k = keyFn(x);
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}

function summaryLines(project, phases, entries, now) {
  let lines = [];
  lines.push("- Exported: " + now.format("YYYY-MM-DD") + " from LatticeTodo");
  let period = periodLine(project, phases, now);
  if (period) lines.push("- Period: " + period);

  let byStatus = countBy(phases, (p) => p.status || "pending");
  let parts = STATUS_ORDER.filter((s) => byStatus[s]).map((s) => byStatus[s] + " " + s);
  lines.push("- Phases: " + phases.length + (parts.length ? " (" + parts.join(", ") + ")" : ""));

  let byKind = countBy(entries, (e) => e.kind || "note");
  let kinds = ["milestone", "decision", "block", "note"].filter((k) => byKind[k]).map((k) => byKind[k] + " " + k + (byKind[k] === 1 ? "" : "s"));
  lines.push("- Log entries: " + entries.length + (kinds.length ? " (" + kinds.join(", ") + ")" : ""));

  let openBlocks = entries.filter((e) => e.kind === "block" && !e.blockEndDate);
  if (openBlocks.length) lines.push("- Open blocks: " + openBlocks.length);
  return lines;
}

function mermaidBlock(name, phases, entries, now) {
  let lines = ["```mermaid", "gantt", "    title " + (mermaidText(name) || "Project"), "    dateFormat YYYY-MM-DD", "    axisFormat %d %b"];
  let hasBody = false;

  let phaseLines = [];
  phases.forEach((p, i) => {
    let s = validDate(p.startDate);
    let e = validDate(p.endDate);
    if (!s || !e || e.isBefore(s)) return;
    let tag = p.status === "done" ? "done, " : p.status === "active" ? "active, " : p.status === "blocked" ? "crit, " : "";
    phaseLines.push("    " + (mermaidText(p.name) || "Phase " + (i + 1)) + " :" + tag + "ph" + (i + 1) + ", " + s.format("YYYY-MM-DD") + ", " + daysInclusive(s, e) + "d");
  });
  if (phaseLines.length) {
    lines.push("    section Phases");
    lines.push(...phaseLines);
    hasBody = true;
  }

  let blocks = [];
  let miles = [];
  entries.forEach((e, i) => {
    let d = validDate(e.date);
    if (!d) return;
    if (e.kind === "block") {
      let end = validDate(e.blockEndDate) || (now.isBefore(d, "day") ? d : now);
      if (end.isBefore(d)) end = d;
      blocks.push("    " + (mermaidText(e.text).slice(0, 48) || "Block") + " :crit, bl" + (i + 1) + ", " + d.format("YYYY-MM-DD") + ", " + daysInclusive(d, end) + "d");
    } else if (e.kind === "milestone") {
      miles.push("    " + (mermaidText(e.text).slice(0, 48) || "Milestone") + " :milestone, ms" + (i + 1) + ", " + d.format("YYYY-MM-DD") + ", 0d");
    }
  });
  if (blocks.length) {
    lines.push("    section Blocks");
    lines.push(...blocks);
    hasBody = true;
  }
  if (miles.length) {
    lines.push("    section Milestones");
    lines.push(...miles);
    hasBody = true;
  }
  lines.push("```");
  return hasBody ? lines.join("\n") : "";
}

function phaseTable(phases, entries) {
  let counts = countBy(entries.filter((e) => e.phaseId), (e) => e.phaseId);
  let rows = ["| # | Phase | Start | End | Days | Status | Log entries |", "|---|-------|-------|-----|------|--------|-------------|"];
  phases.forEach((p, i) => {
    let s = validDate(p.startDate);
    let e = validDate(p.endDate);
    let days = s && e && !e.isBefore(s) ? daysInclusive(s, e) : "";
    rows.push(
      "| " + (i + 1) + " | " + cell(p.name) + " | " + (s ? s.format("YYYY-MM-DD") : cell(p.startDate)) + " | " + (e ? e.format("YYYY-MM-DD") : cell(p.endDate)) +
        " | " + days + " | " + (p.status || "pending") + " | " + (counts[p.id] || 0) + " |"
    );
  });
  return rows.join("\n");
}

function entryLine(entry, phaseNames) {
  let tags = [];
  let kind = KIND_LABEL[entry.kind] || "note";
  tags.push(kind);
  if (entry.snapshotKind && SNAPSHOT_LABEL[entry.snapshotKind]) tags.push(SNAPSHOT_LABEL[entry.snapshotKind]);
  if (entry.kind === "block") {
    let end = validDate(entry.blockEndDate);
    tags.push(end ? "until " + end.format("YYYY-MM-DD") : "ongoing");
  }
  let phase = entry.phaseId && phaseNames[entry.phaseId] ? " (" + phaseNames[entry.phaseId] + ")" : "";
  let date = validDate(entry.date);
  return "- " + (date ? date.format("YYYY-MM-DD") : String(entry.date || "undated")) + " [" + tags.join(", ") + "]" + phase + " " + indentLines(entry.text);
}

function logSection(entries, phases) {
  if (!entries.length) return "No log entries.";
  let phaseNames = {};
  phases.forEach((p) => (phaseNames[p.id] = p.name));
  let out = [];
  let currentMonth = null;
  entries.forEach((e) => {
    let d = validDate(e.date);
    let month = d ? d.format("YYYY-MM") : "undated";
    if (month !== currentMonth) {
      if (currentMonth !== null) out.push("");
      out.push("### " + month);
      out.push("");
      currentMonth = month;
    }
    out.push(entryLine(e, phaseNames));
  });
  return out.join("\n");
}

export default {
  // project: the cTodoListIds entry ({ listName, startDate, endDate, ... }).
  // phases / entries: the project's raw arrays. now: optional moment-able, for tests.
  build(project, phases, entries, now) {
    let today = moment(now || undefined);
    let name = (project && project.listName) || "Project";
    let ph = sortedPhases(phases);
    let en = sortedEntries(entries);

    let parts = ["# " + name + ": timeline and log", "", ...summaryLines(project, ph, en, today), "", "## Timeline", ""];
    if (!ph.length) {
      parts.push("No phases defined.");
    } else {
      let gantt = mermaidBlock(name, ph, en, today);
      if (gantt) parts.push(gantt, "");
      parts.push(phaseTable(ph, en));
    }
    parts.push("", "## Log", "", logSection(en, ph), "");
    return parts.join("\n");
  },

  filename(name, now) {
    let slug = String(name || "project")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return (slug || "project") + "-timeline-log-" + moment(now || undefined).format("YYYY-MM-DD") + ".md";
  },

  // Triggers a browser download of the text as a .md file.
  download(filename, text) {
    let blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
