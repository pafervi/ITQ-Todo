import moment from "moment";
import overviewHelper from "./overviewHelper";
import projectColorHelper from "./projectColorHelper";
import deadlinesHelper from "./deadlinesHelper";

// Data assembly and the "next N days" agenda for the long-term overview.
// build() and the *From() functions are pure (unit-tested); load() gathers
// everything from the store and the database, so the overview view and the
// weekly modals (Friday wrap-up, weekly summary) share one source of truth.

const FMT = overviewHelper.FMT;
const KIND_ORDER = ["deadline", "paper", "talk", "milestone", "ends", "starts", "phase-end", "phase-start", "project-end", "away"];

// Projects (cTodoListIds entries) that can be drawn. A phased project without
// explicit dates takes its range from its phases.
function projectsFrom(lists, phases) {
  let byId = phases || {};
  let entries = (lists || []).map((p) => {
    if (!p || p.type !== "phased") return p;
    let hasRange = overviewHelper.parse(p.startDate) && overviewHelper.parse(p.endDate);
    let own = byId[p.listId] || [];
    if (hasRange || !own.length) return p;
    let starts = own.map((ph) => ph.startDate).filter((d) => overviewHelper.parse(d)).sort();
    let ends = own.map((ph) => ph.endDate).filter((d) => overviewHelper.parse(d)).sort();
    if (!starts.length || !ends.length) return p;
    return { ...p, startDate: starts[0], endDate: ends[ends.length - 1] };
  });
  return overviewHelper.projectBars(entries, (id) => projectColorHelper.solidFor(id));
}

// Pending tasks with a deadline -> board entries. Task deadlines are stored as
// YYYYMMDD; ISO dates are accepted too. Tasks tagged "paper" are flagged.
function deadlinesFrom(tasks, lists) {
  return (tasks || [])
    .map((t) => {
      let d = moment(t.deadline, ["YYYYMMDD", FMT], true);
      if (!d.isValid()) return null;
      let project = (lists || []).find((l) => l && String(l.listId) === String(t.listId));
      let isPaper = (t.tags || []).indexOf("paper") !== -1;
      return {
        id: "dl-" + t.listId + "-" + t.index,
        task: { listId: t.listId, index: t.index },
        date: d.format(FMT),
        title: t.text,
        listName: project ? project.listName : "",
        isPaper: isPaper,
        color: isPaper ? "#9b6bd6" : project ? project.color || projectColorHelper.solidFor(project.listId) : "#e8a33d",
      };
    })
    .filter(Boolean);
}

function talkFrom(config) {
  let date = config && config.nextTalkDate;
  let d = date ? moment(date) : null;
  if (!d || !d.isValid()) return null;
  return { date: d.format(FMT), title: (config.nextTalkTitle || "").trim() };
}

export default {
  // "phase-start" -> "phaseStart", the key used in the i18n files.
  kindKey(kind) {
    return String(kind || "").replace(/-(\w)/g, (m, c) => c.toUpperCase());
  },

  projectsFrom,
  deadlinesFrom,
  talkFrom,

  // input: { items, projects, phases, deadlines, talk }; now: moment-able.
  // Returns { entries, load } where entries are the things that happen in the
  // window [today, today + days], sorted by date, and load is the busiest ISO
  // week touching the window ({ start, count } or null).
  build(input, now, days) {
    let today = moment(now || undefined).startOf("day");
    let end = today.clone().add(days == null ? 30 : days, "days");
    let inWin = (d) => {
      let m = overviewHelper.parse(d);
      return !!m && !m.isBefore(today, "day") && !m.isAfter(end, "day");
    };
    let out = [];
    let push = (date, kind, title, source, extra) => out.push({ date: date, kind: kind, title: title || "", source: source || "", ...(extra || {}) });

    (input.deadlines || []).forEach((d) => {
      if (inWin(d.date)) push(d.date, d.isPaper ? "paper" : "deadline", d.title, d.listName);
    });
    if (input.talk && inWin(input.talk.date)) push(input.talk.date, "talk", input.talk.title, "");

    (input.items || []).forEach((it) => {
      if (!it.startDate) return;
      let s = overviewHelper.parse(it.startDate);
      let e = overviewHelper.parse(it.endDate) || s;
      if (it.kind === "away") {
        if (!e.isBefore(today, "day") && !s.isAfter(end, "day")) {
          let ongoing = s.isBefore(today, "day");
          push(ongoing ? today.format(FMT) : it.startDate, "away", it.title, it.endDate && it.endDate !== it.startDate ? "until " + it.endDate : "", { ongoing: ongoing });
        }
      } else if (it.kind === "milestone") {
        if (inWin(it.startDate)) push(it.startDate, "milestone", it.title, "");
      } else {
        if (inWin(it.startDate)) push(it.startDate, "starts", it.title, "");
        if (it.endDate !== it.startDate && inWin(it.endDate)) push(it.endDate, "ends", it.title, "");
      }
    });

    (input.projects || []).forEach((p) => {
      if (inWin(p.endDate)) push(p.endDate, "project-end", p.name, "");
      ((input.phases || {})[p.id] || []).forEach((ph) => {
        if (ph.status === "done") return;
        if (inWin(ph.startDate)) push(ph.startDate, "phase-start", ph.name, p.name);
        if (inWin(ph.endDate)) push(ph.endDate, "phase-end", ph.name, p.name);
      });
    });

    out.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.title.localeCompare(b.title));

    // Busiest week touching the window.
    let range = { start: today, end: end, days: end.diff(today, "days") + 1 };
    let weeks = overviewHelper.weeklyLoad(range, overviewHelper.loadEntries(input));
    let peak = null;
    weeks.forEach((w) => {
      if (w.count > 0 && (!peak || w.count > peak.count)) peak = { start: w.start, count: w.count, names: w.names };
    });
    return { entries: out, load: peak };
  },

  // Gathers everything from the store and the database. `store` is the Vuex store.
  async load(store) {
    await store.dispatch("loadOverview");
    let lists = store.getters.cTodoListIds || [];
    let phased = lists.filter((p) => p && p.type === "phased" && !p.archived);
    await Promise.all(phased.map((p) => (store.getters.phases[p.listId] ? null : store.dispatch("loadPhases", p.listId))));
    let tasks = await deadlinesHelper.getTasksWithDeadline();
    return {
      items: store.getters.overviewItems,
      lanes: store.getters.overviewLanes,
      phases: store.getters.phases,
      projects: projectsFrom(lists, store.getters.phases),
      deadlines: deadlinesFrom(tasks, lists),
      talk: talkFrom(store.getters.config),
    };
  },
};
