import moment from "moment";
import overviewHelper from "./overviewHelper";

// Pure helpers for the weekly plan of the overview ("Weeks" mode): what to
// work on in each week. No store or DOM access, so everything is unit-tested.
//
//   focus item = { id, weekStart, kind: 'phase'|'goal', projectId, phaseId,
//                  title, subtitle, done, order }
//   - weekStart is the ISO date (YYYY-MM-DD) of the Monday of the week.
//   - A 'phase' item points to a phase of a phased project; title/subtitle keep
//     a snapshot of the phase and project names so the item still reads well if
//     the phase is later renamed or deleted.
//   - A 'goal' is free text, optionally tied to a project (projectId) for colour.

const FMT = overviewHelper.FMT;

function parse(value) {
  return overviewHelper.parse(value);
}

export default {
  FMT,

  // Monday (ISO date) of the week containing `date` (a moment-able value).
  weekStart(date) {
    return moment(date || undefined).startOf("isoWeek").format(FMT);
  },

  // `count` consecutive week starts beginning at the week of `from`.
  weeksFrom(from, count) {
    let first = moment(this.weekStart(from), FMT);
    let out = [];
    for (let i = 0; i < count; i++) out.push(first.clone().add(i, "weeks").format(FMT));
    return out;
  },

  shiftWeek(weekStart, weeks) {
    return moment(this.weekStart(weekStart), FMT).add(weeks, "weeks").format(FMT);
  },

  // { start, end, isoWeek } for a week start (Monday to Sunday).
  weekInfo(weekStart) {
    let m = moment(this.weekStart(weekStart), FMT);
    return { start: m.format(FMT), end: m.clone().add(6, "days").format(FMT), isoWeek: m.isoWeek() };
  },

  // True when the week starting at `weekStart` touches [startDate, endDate].
  // Without a valid range there is nothing to contradict, so it counts as inside.
  overlaps(weekStart, startDate, endDate) {
    let s = parse(startDate);
    let e = parse(endDate) || s;
    if (!s) return true;
    let info = this.weekInfo(weekStart);
    return !e.isBefore(parse(info.start), "day") && !s.isAfter(parse(info.end), "day");
  },

  forWeek(focus, weekStart) {
    return (focus || [])
      .filter((f) => f.weekStart === weekStart)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)));
  },

  nextOrder(focus, weekStart) {
    let mine = this.forWeek(focus, weekStart);
    return mine.length ? Math.max.apply(null, mine.map((f) => f.order || 0)) + 1 : 0;
  },

  // A phase placed in a week, or null when that phase is already there.
  phaseItem(focus, weekStart, project, phase) {
    let week = this.weekStart(weekStart);
    let dup = (focus || []).some((f) => f.kind === "phase" && f.weekStart === week && f.projectId === project.id && f.phaseId === phase.id);
    if (dup) return null;
    return {
      id: overviewHelper.newId("fc"),
      weekStart: week,
      kind: "phase",
      projectId: project.id,
      phaseId: phase.id,
      title: phase.name || "",
      subtitle: project.name || "",
      done: false,
      order: this.nextOrder(focus, week),
    };
  },

  // A free-text goal, or null when the text is empty.
  goalItem(focus, weekStart, text, project) {
    let title = String(text || "").trim();
    if (!title) return null;
    let week = this.weekStart(weekStart);
    return {
      id: overviewHelper.newId("fc"),
      weekStart: week,
      kind: "goal",
      projectId: project ? project.id : "",
      phaseId: "",
      title: title,
      subtitle: project ? project.name || "" : "",
      done: false,
      order: this.nextOrder(focus, week),
    };
  },

  // The item moved to another week (placed last there). A phase that is
  // already in the target week makes the move a no-op (returns null).
  moved(focus, item, weekStart) {
    let week = this.weekStart(weekStart);
    if (item.weekStart === week) return null;
    let dup = item.kind === "phase" && (focus || []).some((f) => f.id !== item.id && f.kind === "phase" && f.weekStart === week && f.projectId === item.projectId && f.phaseId === item.phaseId);
    if (dup) return null;
    return Object.assign({}, item, { weekStart: week, order: this.nextOrder(focus, week) });
  },

  // Phases that can still be planned: not done, from non-archived phased
  // projects. projects: [{ id, name, color }]; phasesById: { [projectId]: [phase] }.
  // Returns [{ project, phases }] with active phases first, then by start date.
  phasePool(projects, phasesById) {
    let rank = { active: 0, blocked: 1, pending: 2 };
    return (projects || [])
      .map((project) => {
        let phases = ((phasesById || {})[project.id] || [])
          .filter((ph) => ph.status !== "done")
          .slice()
          .sort((a, b) => (rank[a.status] != null ? rank[a.status] : 3) - (rank[b.status] != null ? rank[b.status] : 3) || String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")) || (a.order || 0) - (b.order || 0));
        return { project, phases };
      })
      .filter((g) => g.phases.length);
  },

  // How many weeks a phase is planned in.
  placedCount(focus, projectId, phaseId) {
    return (focus || []).filter((f) => f.kind === "phase" && f.projectId === projectId && f.phaseId === phaseId).length;
  },

  // Display data for one focus item.
  // projects: [{ id, name, color }]; phasesById as above.
  // Returns { title, subtitle, color, missing, offDates, projectId }.
  describe(item, projects, phasesById) {
    let project = (projects || []).find((p) => p.id === item.projectId);
    let color = project ? project.color : "";
    let title = item.title;
    let subtitle = project ? project.name : item.subtitle;
    let missing = false;
    let offDates = false;
    if (item.kind === "phase") {
      let list = (phasesById || {})[item.projectId];
      let phase = list ? list.find((ph) => ph.id === item.phaseId) : null;
      if (phase) {
        title = phase.name || title;
        offDates = !this.overlaps(item.weekStart, phase.startDate, phase.endDate);
      } else if (list) {
        // Phases of that project are loaded and this one is gone.
        missing = true;
      }
      if (!project && list === undefined) subtitle = item.subtitle;
    }
    return { title, subtitle, color, missing, offDates, projectId: item.projectId || "" };
  },

  // Items of the current week, for the "this week" bar.
  currentWeek(focus, now) {
    return this.forWeek(focus, this.weekStart(now));
  },

  // Markdown block for the overview export: this week and the next ones with
  // plans. `lookup(item)` returns the display data (see describe()).
  markdown(focus, now, weeksAhead, lookup) {
    let from = this.weekStart(now);
    let weeks = this.weeksFrom(from, weeksAhead || 8);
    let lines = ["## Weekly focus", ""];
    let any = false;
    weeks.forEach((w) => {
      let items = this.forWeek(focus, w);
      if (!items.length) return;
      any = true;
      let info = this.weekInfo(w);
      lines.push("### Week " + info.isoWeek + " (" + info.start + " to " + info.end + ")" + (w === from ? ", this week" : ""), "");
      items.forEach((f) => {
        let d = lookup ? lookup(f) : { title: f.title, subtitle: f.subtitle };
        let label = f.kind === "phase" ? "[phase]" : "[goal]";
        lines.push("- " + (f.done ? "[x] " : "[ ] ") + label + " " + String(d.title || "").replace(/\s+/g, " ").trim() + (d.subtitle ? " (" + String(d.subtitle).replace(/\s+/g, " ").trim() + ")" : ""));
      });
      lines.push("");
    });
    if (!any) lines.push("Nothing planned for the next weeks.", "");
    return lines.join("\n");
  },
};
