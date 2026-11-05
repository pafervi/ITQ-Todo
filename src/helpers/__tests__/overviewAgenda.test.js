import { describe, it, expect, vi } from "vitest";

vi.mock("../deadlinesHelper", () => ({ default: { getTasksWithDeadline: () => Promise.resolve([]) } }));

import agenda from "../overviewAgenda";

const NOW = "2026-11-05";
const input = {
  items: [
    { id: "1", title: "Write paper", kind: "block", startDate: "2026-11-10", endDate: "2026-11-25" },
    { id: "2", title: "Old", kind: "block", startDate: "2026-09-01", endDate: "2026-10-01" },
    { id: "3", title: "Congress", kind: "milestone", startDate: "2026-11-20", endDate: "2026-11-20" },
    { id: "4", title: "Stay at MIT", kind: "away", startDate: "2026-11-01", endDate: "2026-11-12" },
    { id: "5", title: "Far", kind: "block", startDate: "2027-03-01", endDate: "2027-03-10" },
  ],
  projects: [{ id: "p1", name: "Al-pair", startDate: "2026-09-01", endDate: "2026-11-30" }],
  phases: { p1: [{ name: "Training", startDate: "2026-10-01", endDate: "2026-11-15", status: "active" }, { name: "Done", startDate: "2026-11-06", endDate: "2026-11-07", status: "done" }] },
  deadlines: [
    { id: "d1", date: "2026-11-08", title: "Submit abstract", listName: "Al-pair", isPaper: false },
    { id: "d2", date: "2026-11-09", title: "Reviewer reply", listName: "Paper", isPaper: true },
    { id: "d3", date: "2026-11-01", title: "Past", listName: "", isPaper: false },
  ],
  talk: { date: "2026-11-18", title: "Seminar" },
};

describe("overviewAgenda.build", () => {
  const { entries, load } = agenda.build(input, NOW, 30);
  const kinds = entries.map((e) => e.kind + ":" + e.title);

  it("collects the next 30 days in date order", () => {
    expect(entries.map((e) => e.date)).toEqual([...entries.map((e) => e.date)].sort());
    expect(kinds).toContain("deadline:Submit abstract");
    expect(kinds).toContain("paper:Reviewer reply");
    expect(kinds).toContain("talk:Seminar");
    expect(kinds).toContain("milestone:Congress");
    expect(kinds).toContain("starts:Write paper");
    expect(kinds).toContain("ends:Write paper");
    expect(kinds).toContain("project-end:Al-pair");
    expect(kinds).toContain("phase-end:Training");
  });

  it("leaves out past and far items and finished phases", () => {
    expect(kinds.join("|")).not.toContain("Past");
    expect(kinds.join("|")).not.toContain("Far");
    expect(kinds.join("|")).not.toContain("Old");
    expect(kinds.join("|")).not.toContain("phase-start:Done");
    expect(kinds.join("|")).not.toContain("phase-end:Done");
  });

  it("reports an ongoing away block from today", () => {
    let away = entries.find((e) => e.kind === "away");
    expect(away.date).toBe("2026-11-05");
    expect(away.ongoing).toBe(true);
    expect(away.source).toBe("until 2026-11-12");
  });

  it("finds the busiest week without counting away blocks", () => {
    expect(load.count).toBeGreaterThanOrEqual(4);
    expect(load.names).not.toContain("Stay at MIT");
  });

  it("returns no load peak for an empty plan", () => {
    expect(agenda.build({}, NOW, 30)).toEqual({ entries: [], load: null });
  });
});

describe("overviewAgenda helpers", () => {
  it("maps task deadlines (YYYYMMDD) and flags papers", () => {
    let d = agenda.deadlinesFrom(
      [{ listId: "a", index: 0, text: "x", deadline: "20261201", tags: ["paper"] }, { listId: "b", index: 1, text: "y", deadline: "garbage" }],
      [{ listId: "a", listName: "A" }]
    );
    expect(d).toHaveLength(1);
    expect(d[0].date).toBe("2026-12-01");
    expect(d[0].isPaper).toBe(true);
    expect(d[0].listName).toBe("A");
  });
  it("reads the talk from config", () => {
    expect(agenda.talkFrom({ nextTalkDate: "2026-11-18", nextTalkTitle: " Seminar " })).toEqual({ date: "2026-11-18", title: "Seminar" });
    expect(agenda.talkFrom({ nextTalkDate: "" })).toBeNull();
  });
  it("derives a phased project range from its phases", () => {
    let p = agenda.projectsFrom([{ listId: "x", type: "phased", listName: "X" }], { x: [{ startDate: "2026-10-01", endDate: "2026-12-01" }, { startDate: "2026-12-02", endDate: "2027-01-10" }] });
    expect(p[0].startDate).toBe("2026-10-01");
    expect(p[0].endDate).toBe("2027-01-10");
  });
});
