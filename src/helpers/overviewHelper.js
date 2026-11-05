import moment from "moment";

// Pure helpers for the long-term overview (academic year board). No store or
// DOM access, so everything here can be unit-tested.
//
// Data model (persisted by overview.store.js):
//   item = { id, laneId, kind: 'block'|'milestone', title, startDate, endDate,
//            color, notes }
//   - dates are ISO strings (YYYY-MM-DD). An item without startDate is
//     "unscheduled" (an idea waiting for a slot). A milestone has
//     endDate === startDate.
//   lane = { id, name, color }

const FMT = "YYYY-MM-DD";

function parse(value) {
  let m = moment(value, FMT, true);
  return m.isValid() ? m : null;
}

export default {
  FMT,
  parse,

  newId(prefix) {
    return (prefix || "ov") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // Academic year runs September to August. Returns the calendar year in
  // which the academic year starts (Nov 2026 -> 2026, Mar 2027 -> 2026).
  academicYearOf(date) {
    let m = moment(date || undefined);
    return m.month() >= 8 ? m.year() : m.year() - 1;
  },

  // { start, end, days, label } for the academic year starting in `startYear`.
  yearRange(startYear) {
    let start = moment({ year: startYear, month: 8, day: 1 });
    let end = moment({ year: startYear + 1, month: 7, day: 31 });
    return {
      start: start,
      end: end,
      days: end.diff(start, "days") + 1,
      label: startYear + "/" + String((startYear + 1) % 100).padStart(2, "0"),
    };
  },

  // Twelve month columns: { index (0-11, 0 = September), month (0-11 calendar
  // month), year, left, width } with left/width in percent of the year.
  months(startYear) {
    let range = this.yearRange(startYear);
    let out = [];
    for (let i = 0; i < 12; i++) {
      let first = range.start.clone().add(i, "months");
      let days = first.daysInMonth();
      out.push({
        index: i,
        month: first.month(),
        year: first.year(),
        left: (first.diff(range.start, "days") / range.days) * 100,
        width: (days / range.days) * 100,
      });
    }
    return out;
  },

  // Percent position (0-100) of a date inside the range, or null if invalid.
  // Not clamped, so callers can tell "before" (<0) from "after" (>100).
  pct(range, date) {
    let d = parse(date);
    if (!d) return null;
    return (d.diff(range.start, "days") / range.days) * 100;
  },

  // Geometry of a bar clipped to the visible year, or null when the item does
  // not touch it. A milestone gets a fixed minimal width. Returns
  // { left, width, clippedStart, clippedEnd } (percent + flags for open ends).
  geometry(range, startDate, endDate) {
    let s = parse(startDate);
    if (!s) return null;
    let e = parse(endDate) || s;
    if (e.isBefore(s)) e = s;
    if (e.isBefore(range.start, "day") || s.isAfter(range.end, "day")) return null;
    let cs = s.isBefore(range.start, "day") ? range.start : s;
    let ce = e.isAfter(range.end, "day") ? range.end : e;
    let left = (cs.diff(range.start, "days") / range.days) * 100;
    let width = ((ce.diff(cs, "days") + 1) / range.days) * 100;
    return {
      left: left,
      width: Math.max(width, 0.35),
      clippedStart: s.isBefore(range.start, "day"),
      clippedEnd: e.isAfter(range.end, "day"),
    };
  },

  // Greedy row packing so overlapping bars of one lane stack instead of
  // hiding each other. entries: [{ id, startDate, endDate }]. A small gap
  // (in days) keeps adjacent bars from touching. Returns { rows: {id: row},
  // count } where count is the number of rows used (at least 1).
  packRows(entries, gapDays) {
    let gap = gapDays == null ? 1 : gapDays;
    let list = (entries || [])
      .map((x) => {
        let s = parse(x.startDate);
        let e = parse(x.endDate) || s;
        return s ? { id: x.id, s: s, e: e.isBefore(s) ? s : e } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.s.valueOf() - b.s.valueOf() || a.e.valueOf() - b.e.valueOf());
    let rowEnds = [];
    let rows = {};
    list.forEach((x) => {
      let r = rowEnds.findIndex((end) => x.s.diff(end, "days") > gap);
      if (r < 0) {
        r = rowEnds.length;
        rowEnds.push(x.e);
      } else {
        rowEnds[r] = x.e;
      }
      rows[x.id] = r;
    });
    return { rows: rows, count: Math.max(rowEnds.length, 1) };
  },

  // Entries that count as "load" in the weekly strip: everything the user has
  // to deal with, but not the grey "away" blocks. Each entry is
  // { id, label, startDate, endDate }. Inputs:
  //   items: overview items, projects: projectBars() output,
  //   deadlines: [{ id, date, title }], talk: { date, title } | null
  loadEntries(input) {
    let out = [];
    (input.items || []).forEach((it) => {
      if (!it.startDate || it.kind === "away") return;
      out.push({ id: it.id, label: it.title, startDate: it.startDate, endDate: it.endDate || it.startDate });
    });
    (input.projects || []).forEach((p) => out.push({ id: "prj-" + p.id, label: p.name, startDate: p.startDate, endDate: p.endDate }));
    (input.deadlines || []).forEach((d) => out.push({ id: d.id, label: d.title, startDate: d.date, endDate: d.date }));
    if (input.talk && parse(input.talk.date)) out.push({ id: "talk", label: input.talk.title || "Talk", startDate: input.talk.date, endDate: input.talk.date });
    return out;
  },

  // One cell per ISO week (Monday to Sunday) that touches the range. Returns
  // [{ start, end, left, width, count, names }] where left/width are percent
  // of the range (clipped) and names lists up to six overlapping labels.
  weeklyLoad(range, entries) {
    let weeks = [];
    let monday = range.start.clone().startOf("isoWeek");
    let list = (entries || [])
      .map((e) => ({ label: e.label, s: parse(e.startDate), e: parse(e.endDate) || parse(e.startDate) }))
      .filter((e) => e.s);
    while (!monday.isAfter(range.end, "day")) {
      let sunday = monday.clone().add(6, "days");
      let cs = monday.isBefore(range.start, "day") ? range.start : monday;
      let ce = sunday.isAfter(range.end, "day") ? range.end : sunday;
      let names = [];
      let count = 0;
      list.forEach((e) => {
        let end = e.e.isBefore(e.s) ? e.s : e.e;
        if (!end.isBefore(monday, "day") && !e.s.isAfter(sunday, "day")) {
          count++;
          if (names.length < 6) names.push(e.label);
        }
      });
      weeks.push({
        start: monday.format(FMT),
        end: sunday.format(FMT),
        left: (cs.diff(range.start, "days") / range.days) * 100,
        width: ((ce.diff(cs, "days") + 1) / range.days) * 100,
        count: count,
        names: names,
      });
      monday = monday.clone().add(7, "days");
    }
    return weeks;
  },

  // 0 (free) to 4 (overloaded) bucket for the weekly strip colours.
  loadLevel(count) {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  },

  shiftDate(date, days) {
    let d = parse(date);
    return d ? d.clone().add(days, "days").format(FMT) : date;
  },

  // Normalises a user-edited item: milestone collapses to one day, an end
  // before the start is lifted to the start, unscheduled items lose dates.
  normalizeItem(item) {
    let out = Object.assign({}, item);
    out.title = String(out.title || "").trim();
    let s = parse(out.startDate);
    if (!s) {
      out.startDate = "";
      out.endDate = "";
      return out;
    }
    let e = parse(out.endDate) || s;
    if (out.kind === "milestone" || e.isBefore(s)) e = s;
    out.startDate = s.format(FMT);
    out.endDate = e.format(FMT);
    return out;
  },

  // Projects (cTodoListIds entries) that can be drawn: not archived and with
  // a valid start and end date. Returns [{ id, name, startDate, endDate, color, index }].
  projectBars(cTodoListIds, colorFor) {
    let out = [];
    (cTodoListIds || []).forEach((p, index) => {
      if (!p || p.archived) return;
      let s = parse(p.startDate);
      let e = parse(p.endDate);
      if (!s || !e || e.isBefore(s)) return;
      out.push({
        id: p.listId,
        name: p.listName || "",
        startDate: s.format(FMT),
        endDate: e.format(FMT),
        color: p.color || (colorFor ? colorFor(p.listId) : ""),
        index: index,
      });
    });
    return out;
  },
};
