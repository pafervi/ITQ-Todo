import { describe, it, expect } from "vitest";
import helper from "../overviewHelper";

describe("overviewHelper", () => {
  it("maps dates to the academic year that contains them", () => {
    expect(helper.academicYearOf("2026-11-05")).toBe(2026);
    expect(helper.academicYearOf("2027-03-01")).toBe(2026);
    expect(helper.academicYearOf("2026-08-31")).toBe(2025);
    expect(helper.academicYearOf("2026-09-01")).toBe(2026);
  });

  it("builds the September-August range and label", () => {
    let r = helper.yearRange(2026);
    expect(r.start.format("YYYY-MM-DD")).toBe("2026-09-01");
    expect(r.end.format("YYYY-MM-DD")).toBe("2027-08-31");
    expect(r.days).toBe(365);
    expect(r.label).toBe("2026/27");
  });

  it("gives twelve contiguous month columns starting in September", () => {
    let m = helper.months(2026);
    expect(m).toHaveLength(12);
    expect(m[0].month).toBe(8);
    expect(m[4].month).toBe(0);
    expect(m[0].left).toBe(0);
    expect(m[11].left + m[11].width).toBeCloseTo(100, 6);
    for (let i = 1; i < 12; i++) expect(m[i].left).toBeCloseTo(m[i - 1].left + m[i - 1].width, 6);
  });

  it("clips bars to the visible year and ignores bars outside it", () => {
    let r = helper.yearRange(2026);
    expect(helper.geometry(r, "2025-01-01", "2025-12-31")).toBeNull();
    expect(helper.geometry(r, "2027-09-01", "2027-10-01")).toBeNull();
    let g = helper.geometry(r, "2026-06-01", "2026-10-01");
    expect(g.clippedStart).toBe(true);
    expect(g.left).toBe(0);
    let g2 = helper.geometry(r, "2027-08-01", "2027-12-01");
    expect(g2.clippedEnd).toBe(true);
    expect(g2.left + g2.width).toBeCloseTo(100, 6);
  });

  it("gives milestones a visible width", () => {
    let g = helper.geometry(helper.yearRange(2026), "2026-12-15", "2026-12-15");
    expect(g.width).toBeGreaterThanOrEqual(0.35);
  });

  it("stacks overlapping bars and reuses rows when free", () => {
    let res = helper.packRows([
      { id: "a", startDate: "2026-09-01", endDate: "2026-10-31" },
      { id: "b", startDate: "2026-10-01", endDate: "2026-11-30" },
      { id: "c", startDate: "2026-12-05", endDate: "2026-12-20" },
    ]);
    expect(res.rows.a).toBe(0);
    expect(res.rows.b).toBe(1);
    expect(res.rows.c).toBe(0);
    expect(res.count).toBe(2);
    expect(helper.packRows([]).count).toBe(1);
  });

  it("normalises items", () => {
    let m = helper.normalizeItem({ title: "  Congress ", kind: "milestone", startDate: "2027-03-10", endDate: "2027-03-14" });
    expect(m.title).toBe("Congress");
    expect(m.endDate).toBe("2027-03-10");
    let b = helper.normalizeItem({ title: "x", kind: "block", startDate: "2027-03-10", endDate: "2027-03-01" });
    expect(b.endDate).toBe("2027-03-10");
    let u = helper.normalizeItem({ title: "idea", kind: "block", startDate: "garbage", endDate: "2027-01-01" });
    expect(u.startDate).toBe("");
    expect(u.endDate).toBe("");
  });

  it("selects drawable, non-archived projects", () => {
    let bars = helper.projectBars(
      [
        { listId: "p1", listName: "A", startDate: "2026-09-01", endDate: "2026-12-01" },
        { listId: "p2", listName: "B", startDate: "2026-09-01", endDate: "2026-12-01", archived: true },
        { listId: "p3", listName: "C" },
        { listId: "p4", listName: "D", startDate: "2026-12-01", endDate: "2026-09-01" },
        { listId: "p5", listName: "E", startDate: "2026-10-01", endDate: "2026-11-01", color: "#f00" },
      ],
      () => "auto"
    );
    expect(bars.map((b) => b.id)).toEqual(["p1", "p5"]);
    expect(bars[0].color).toBe("auto");
    expect(bars[1].color).toBe("#f00");
  });
});

describe("overviewHelper weekly load", () => {
  const range = helper.yearRange(2026);

  it("builds load entries without away blocks", () => {
    let e = helper.loadEntries({
      items: [
        { id: "a", title: "A", startDate: "2026-10-01", endDate: "2026-10-10", kind: "block" },
        { id: "b", title: "Holiday", startDate: "2026-12-20", endDate: "2027-01-06", kind: "away" },
        { id: "c", title: "Idea", startDate: "", endDate: "" },
      ],
      projects: [{ id: "p", name: "P", startDate: "2026-09-01", endDate: "2026-12-01" }],
      deadlines: [{ id: "d", title: "D", date: "2026-10-05" }],
      talk: { date: "2026-11-20", title: "Talk" },
    });
    expect(e.map((x) => x.id)).toEqual(["a", "prj-p", "d", "talk"]);
  });

  it("counts overlaps per ISO week and clips weeks to the range", () => {
    let weeks = helper.weeklyLoad(range, [
      { label: "A", startDate: "2026-10-01", endDate: "2026-10-10" },
      { label: "B", startDate: "2026-10-05", endDate: "2026-10-05" },
    ]);
    expect(weeks[0].start).toBe("2026-08-31");
    expect(weeks[0].left).toBe(0);
    let w = weeks.find((x) => x.start === "2026-10-05");
    expect(w.count).toBe(2);
    expect(w.names).toEqual(["A", "B"]);
    expect(weeks.find((x) => x.start === "2026-09-28").count).toBe(1);
    expect(weeks.find((x) => x.start === "2026-10-12").count).toBe(0);
    let last = weeks[weeks.length - 1];
    expect(last.left + last.width).toBeCloseTo(100, 6);
  });

  it("maps counts to levels", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 12].map((n) => helper.loadLevel(n))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
