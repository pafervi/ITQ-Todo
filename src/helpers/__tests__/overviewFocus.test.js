import { describe, it, expect } from "vitest";
import focus from "../overviewFocus";

const projA = { id: "a", name: "MFI defects", color: "#5e6ef2" };
const projB = { id: "b", name: "CeO2 polaron", color: "#e8a33d" };
const phasesById = {
  a: [
    { id: "a1", name: "Benchmark DFT", status: "done", startDate: "2026-09-01", endDate: "2026-09-30", order: 0 },
    { id: "a2", name: "MACE training", status: "active", startDate: "2026-10-01", endDate: "2026-11-20", order: 1 },
    { id: "a3", name: "TS search", status: "pending", startDate: "2026-11-21", endDate: "2026-12-15", order: 2 },
  ],
  b: [{ id: "b1", name: "Slab setup", status: "pending", startDate: "2026-11-02", endDate: "2026-11-13", order: 0 }],
};

describe("overviewFocus weeks", () => {
  it("finds the Monday of a week", () => {
    expect(focus.weekStart("2026-11-05")).toBe("2026-11-02"); // Thursday
    expect(focus.weekStart("2026-11-02")).toBe("2026-11-02");
    expect(focus.weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
  });
  it("lists consecutive weeks and shifts", () => {
    expect(focus.weeksFrom("2026-11-05", 3)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(focus.shiftWeek("2026-11-05", -1)).toBe("2026-10-26");
  });
  it("describes a week", () => {
    expect(focus.weekInfo("2026-11-04")).toEqual({ start: "2026-11-02", end: "2026-11-08", isoWeek: 45 });
  });
  it("checks overlap with a date range", () => {
    expect(focus.overlaps("2026-11-02", "2026-10-01", "2026-11-20")).toBe(true);
    expect(focus.overlaps("2026-11-23", "2026-10-01", "2026-11-20")).toBe(false);
    expect(focus.overlaps("2026-11-02", "", "")).toBe(true);
  });
});

describe("overviewFocus items", () => {
  it("places a phase once per week", () => {
    let a = focus.phaseItem([], "2026-11-05", projA, phasesById.a[1]);
    expect(a).toMatchObject({ weekStart: "2026-11-02", kind: "phase", projectId: "a", phaseId: "a2", title: "MACE training", subtitle: "MFI defects", done: false, order: 0 });
    expect(focus.phaseItem([a], "2026-11-03", projA, phasesById.a[1])).toBeNull();
    expect(focus.phaseItem([a], "2026-11-10", projA, phasesById.a[1])).not.toBeNull();
  });
  it("orders items inside a week", () => {
    let a = focus.phaseItem([], "2026-11-02", projA, phasesById.a[1]);
    let b = focus.goalItem([a], "2026-11-02", "Prepare talk", null);
    expect(b.order).toBe(1);
    expect(focus.forWeek([b, a], "2026-11-02").map((f) => f.id)).toEqual([a.id, b.id]);
  });
  it("rejects empty goals and links a project", () => {
    expect(focus.goalItem([], "2026-11-02", "   ", null)).toBeNull();
    expect(focus.goalItem([], "2026-11-02", " Write intro ", projB)).toMatchObject({ kind: "goal", title: "Write intro", projectId: "b", subtitle: "CeO2 polaron" });
  });
  it("moves an item to another week, not onto a duplicate", () => {
    let a = focus.phaseItem([], "2026-11-02", projA, phasesById.a[1]);
    let b = focus.phaseItem([a], "2026-11-09", projA, phasesById.a[1]);
    expect(focus.moved([a, b], a, "2026-11-04")).toBeNull(); // same week
    expect(focus.moved([a, b], a, "2026-11-09")).toBeNull(); // duplicate phase there
    expect(focus.moved([a], a, "2026-11-16")).toMatchObject({ weekStart: "2026-11-16", id: a.id });
  });
  it("counts how many weeks a phase is planned in", () => {
    let a = focus.phaseItem([], "2026-11-02", projA, phasesById.a[1]);
    let b = focus.phaseItem([a], "2026-11-09", projA, phasesById.a[1]);
    expect(focus.placedCount([a, b], "a", "a2")).toBe(2);
    expect(focus.placedCount([a, b], "a", "a3")).toBe(0);
  });
});

describe("overviewFocus pool and display", () => {
  it("lists open phases, active first, skipping done ones and empty projects", () => {
    let pool = focus.phasePool([projA, projB, { id: "c", name: "Empty" }], phasesById);
    expect(pool.map((g) => g.project.id)).toEqual(["a", "b"]);
    expect(pool[0].phases.map((p) => p.id)).toEqual(["a2", "a3"]);
  });
  it("describes with live phase data and flags off-date weeks", () => {
    let item = focus.phaseItem([], "2026-11-30", projA, phasesById.a[1]);
    let d = focus.describe(item, [projA], phasesById);
    expect(d).toMatchObject({ title: "MACE training", subtitle: "MFI defects", color: "#5e6ef2", missing: false, offDates: true });
  });
  it("keeps the snapshot when the phase is gone", () => {
    let item = focus.phaseItem([], "2026-11-02", projA, { id: "zz", name: "Old phase" });
    let d = focus.describe(item, [projA], phasesById);
    expect(d.missing).toBe(true);
    expect(d.title).toBe("Old phase");
  });
  it("does not flag missing while the phases are not loaded", () => {
    let item = focus.phaseItem([], "2026-11-02", projA, phasesById.a[1]);
    expect(focus.describe(item, [projA], {}).missing).toBe(false);
  });
  it("exports the planned weeks as markdown", () => {
    let a = focus.phaseItem([], "2026-11-02", projA, phasesById.a[1]);
    let g = Object.assign(focus.goalItem([a], "2026-11-09", "Prepare talk", null), { done: true });
    let text = focus.markdown([a, g], "2026-11-05", 4, (f) => focus.describe(f, [projA], phasesById));
    expect(text).toContain("## Weekly focus");
    expect(text).toContain("### Week 45 (2026-11-02 to 2026-11-08), this week");
    expect(text).toContain("- [ ] [phase] MACE training (MFI defects)");
    expect(text).toContain("- [x] [goal] Prepare talk");
    expect(focus.markdown([], "2026-11-05", 4)).toContain("Nothing planned");
  });
});
