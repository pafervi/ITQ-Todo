import moment from "moment";
import overviewHelper from "./overviewHelper";

// Markdown export of the academic-year overview, meant to be pasted or
// uploaded as context for an LLM project or a report. Pure function, output
// always in English so the headings stay predictable.

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function period(startDate, endDate) {
  return startDate === endDate ? startDate : startDate + " to " + endDate;
}

export default {
  // input: { startYear, lanes, items, projects, phases, deadlines }
  //   projects: [{ id, name, startDate, endDate }]   (as returned by overviewHelper.projectBars)
  //   phases:   { [projectId]: [{ name, startDate, endDate, status }] }
  //   deadlines: [{ date, title, listName }]
  build(input, now) {
    let today = moment(now || undefined);
    let range = overviewHelper.yearRange(input.startYear);
    let touches = (s, e) => !!overviewHelper.geometry(range, s, e);
    let lines = ["# Academic year " + range.label + ": overview", "", "- Exported: " + today.format(overviewHelper.FMT) + " from LatticeTodo", "- Range: " + range.start.format(overviewHelper.FMT) + " to " + range.end.format(overviewHelper.FMT), ""];

    let projects = (input.projects || []).filter((p) => touches(p.startDate, p.endDate)).sort((a, b) => a.startDate.localeCompare(b.startDate));
    lines.push("## Projects", "");
    if (!projects.length) lines.push("No dated projects in this academic year.");
    projects.forEach((p) => {
      lines.push("- " + clean(p.name) + ": " + period(p.startDate, p.endDate));
      let phases = ((input.phases || {})[p.id] || []).slice().sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
      phases.forEach((ph) => lines.push("  - " + clean(ph.name) + " [" + (ph.status || "pending") + "]: " + period(ph.startDate, ph.endDate)));
    });
    lines.push("");

    lines.push("## Plan by lane", "");
    let items = input.items || [];
    (input.lanes || []).forEach((lane) => {
      let mine = items
        .filter((it) => it.startDate && it.laneId === lane.id && touches(it.startDate, it.endDate))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || String(a.title).localeCompare(String(b.title)));
      lines.push("### " + clean(lane.name), "");
      if (!mine.length) lines.push("Nothing planned.");
      mine.forEach((it) => {
        let tag = it.kind === "milestone" ? "milestone" : "period";
        let notes = clean(it.notes);
        lines.push("- " + period(it.startDate, it.endDate) + " [" + tag + "] " + clean(it.title) + (notes ? ": " + notes : ""));
      });
      lines.push("");
    });

    let deadlines = (input.deadlines || []).filter((d) => touches(d.date, d.date)).sort((a, b) => a.date.localeCompare(b.date));
    lines.push("## Task deadlines", "");
    if (!deadlines.length) lines.push("No pending task deadlines in this academic year.");
    deadlines.forEach((d) => lines.push("- " + d.date + " " + clean(d.title) + (d.listName ? " (" + clean(d.listName) + ")" : "")));
    lines.push("");

    let laneName = {};
    (input.lanes || []).forEach((l) => (laneName[l.id] = l.name));
    let ideas = items.filter((it) => !it.startDate);
    lines.push("## Ideas without a date", "");
    if (!ideas.length) lines.push("None.");
    ideas.forEach((it) => {
      let notes = clean(it.notes);
      lines.push("- " + clean(it.title) + (laneName[it.laneId] ? " (" + clean(laneName[it.laneId]) + ")" : "") + (notes ? ": " + notes : ""));
    });
    lines.push("");
    return lines.join("\n");
  },

  filename(startYear, now) {
    let range = overviewHelper.yearRange(startYear);
    return "academic-year-" + range.label.replace("/", "-") + "-overview-" + moment(now || undefined).format(overviewHelper.FMT) + ".md";
  },
};
