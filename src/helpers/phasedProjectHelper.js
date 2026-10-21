import moment from "moment";

// Palette for phase bars. Deterministic assignment by phase order so phases
// keep their colour across reloads without storing explicit colour values on
// the plain cases.
const PHASE_PALETTE = [
  "#3f6d9a", // p1 blue
  "#4b8a7f", // p2 teal
  "#b8893a", // p3 gold
  "#a3573b", // p4 terracotta
  "#7a5a98", // p5 purple
  "#5c7c3a", // p6 olive (fallback for >5 phases)
  "#9a4b6b", // p7 wine
  "#406685", // p8 slate blue
];

export default {
  // Check whether a cTodoListIds entry represents a phased project.
  isPhased(cList) {
    return !!(cList && cList.type === "phased");
  },

  // Deterministic phase colour by its order index. If the phase carries an
  // explicit colour (user override) that wins.
  phaseColor(phase, orderIndex) {
    if (phase && phase.color) return phase.color;
    let i = typeof orderIndex === "number" ? orderIndex : phase && phase.order ? phase.order : 0;
    return PHASE_PALETTE[i % PHASE_PALETTE.length];
  },

  palette() {
    return PHASE_PALETTE.slice();
  },

  // Position (0..100) of a date within the project range. Clamped so that
  // dates before/after the range do not escape the track.
  pct(date, rangeStart, rangeEnd) {
    let d = moment(date);
    let a = moment(rangeStart);
    let b = moment(rangeEnd);
    let total = b.diff(a);
    if (total <= 0) return 0;
    let v = ((d.diff(a)) / total) * 100;
    if (v < 0) return 0;
    if (v > 100) return 100;
    return v;
  },

  // Signed version of pct(): returns the raw percentage (can be <0 or >100)
  // so callers can decide whether to render the mark at all (today line
  // outside the range is simply not drawn).
  rawPct(date, rangeStart, rangeEnd) {
    let d = moment(date);
    let a = moment(rangeStart);
    let b = moment(rangeEnd);
    let total = b.diff(a);
    if (total <= 0) return 0;
    return ((d.diff(a)) / total) * 100;
  },

  // Compute the effective project range. If the project has explicit start
  // and end dates stored on the cTodoListIds entry, use those. Otherwise
  // derive from the phases: earliest phase start, latest phase end + 7 days
  // of margin so the "today" line stays visible for a few days after the
  // last phase ends.
  projectRange(cList, phases) {
    let start = cList && cList.startDate ? moment(cList.startDate) : null;
    let end = cList && cList.endDate ? moment(cList.endDate) : null;
    if (!start && phases && phases.length) {
      let dates = phases.map((p) => moment(p.startDate)).filter((d) => d.isValid());
      if (dates.length) start = moment.min(dates);
    }
    if (!end && phases && phases.length) {
      let dates = phases.map((p) => moment(p.endDate)).filter((d) => d.isValid());
      if (dates.length) end = moment.max(dates).add(7, "days");
    }
    if (!start) start = moment().subtract(14, "days");
    if (!end) end = moment().add(60, "days");
    return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
  },

  // ISO month labels for the Gantt header. Returns [{label, pct}] for every
  // first-of-month that falls inside the range, so the header can render
  // tick labels at the right x position.
  monthLabels(rangeStart, rangeEnd) {
    let a = moment(rangeStart).startOf("month");
    let b = moment(rangeEnd);
    let out = [];
    let cur = a.clone();
    while (cur.isSameOrBefore(b)) {
      let p = this.rawPct(cur, rangeStart, rangeEnd);
      if (p >= 0 && p <= 100) {
        out.push({ label: cur.format("MMM YYYY"), pct: p });
      }
      cur.add(1, "month");
    }
    return out;
  },

  // Generate a UUID-ish id without requiring the uuid package.
  newId(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  },

  // Status colour (not phase colour) for pills and chips.
  statusColor(status) {
    switch (status) {
      case "active": return "#2b7a78";
      case "done": return "#4b8a7f";
      case "blocked": return "#c84b3b";
      case "pending":
      default: return "#9a9c9e";
    }
  },

  // Log entry marker colour by kind, used both on the Gantt markers and the
  // Feed icon.
  entryKindColor(kind) {
    switch (kind) {
      case "milestone": return "#2b7a78";
      case "decision": return "#b8893a";
      case "block": return "#c84b3b";
      case "note":
      default: return "#5e6ef2";
    }
  },

  // Check: is today a monday/friday snapshot day, and has the snapshot not
  // already been taken this week? config holds lastMondaySnapshot and
  // lastFridaySnapshot as ISO date strings (YYYY-MM-DD).
  snapshotDueKind(config, now) {
    let today = now ? moment(now) : moment();
    let dow = today.isoWeekday(); // 1 = Monday, 5 = Friday
    let todayKey = today.format("YYYY-MM-DD");
    if (dow === 1) {
      let last = (config && config.lastMondaySnapshot) || "";
      if (last !== todayKey) return "monday";
    }
    if (dow === 5) {
      let last = (config && config.lastFridaySnapshot) || "";
      if (last !== todayKey) return "friday";
    }
    return null;
  },
};
