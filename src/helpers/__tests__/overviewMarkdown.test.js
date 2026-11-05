import { describe, it, expect } from "vitest";
import md from "../overviewMarkdown";

const input = {
  startYear: 2026,
  lanes: [
    { id: "l1", name: "Research" },
    { id: "l2", name: "Teaching" },
  ],
  items: [
    { id: "1", laneId: "l1", kind: "block", title: "Write paper", startDate: "2026-12-19", endDate: "2027-01-31", notes: "first draft\nwith figures" },
    { id: "2", laneId: "l1", kind: "milestone", title: "Congress", startDate: "2027-03-10", endDate: "2027-03-10" },
    { id: "3", laneId: "l2", kind: "block", title: "Old course", startDate: "2025-01-01", endDate: "2025-02-01" },
    { id: "4", laneId: "l2", kind: "block", title: "ML course", startDate: "", endDate: "" },
    { id: "5", laneId: "__away__", kind: "away", title: "Christmas break", startDate: "2026-12-24", endDate: "2027-01-06", notes: "" },
  ],
  projects: [{ id: "p1", name: "Al-pair MFI", startDate: "2026-09-01", endDate: "2027-02-15" }],
  phases: { p1: [{ name: "Training", startDate: "2026-10-16", endDate: "2026-12-20", status: "active" }] },
  deadlines: [
    { date: "2026-12-03", title: "Send report", listName: "Al-pair MFI" },
    { date: "2025-12-03", title: "Past year", listName: "" },
    { date: "2026-12-10", title: "Response to reviewers", listName: "Paper", isPaper: true },
  ],
  talk: { date: "2027-02-01", title: "Group seminar" },
};

describe("overviewMarkdown.build", () => {
  const out = md.build(input, "2026-11-05");
  it("has the header and range", () => {
    expect(out.startsWith("# Academic year 2026/27: overview")).toBe(true);
    expect(out).toContain("- Range: 2026-09-01 to 2027-08-31");
  });
  it("lists projects with their phases", () => {
    expect(out).toContain("- Al-pair MFI: 2026-09-01 to 2027-02-15");
    expect(out).toContain("  - Training [active]: 2026-10-16 to 2026-12-20");
  });
  it("groups items by lane, flattens notes and drops items outside the year", () => {
    expect(out).toContain("- 2026-12-19 to 2027-01-31 [period] Write paper: first draft with figures");
    expect(out).toContain("- 2027-03-10 [milestone] Congress");
    expect(out).not.toContain("Old course");
    expect(out).toContain("### Teaching\n\nNothing planned.");
  });
  it("lists deadlines of the year and the undated ideas", () => {
    expect(out).toContain("- 2026-12-03 Send report (Al-pair MFI)");
    expect(out).not.toContain("Past year");
    expect(out).toContain("- ML course (Teaching)");
  });
  it("lists unavailable periods apart from the lanes", () => {
    expect(out).toContain("## Unavailable periods\n\n- 2026-12-24 to 2027-01-06 Christmas break");
    expect(out.split("## Unavailable periods")[0]).not.toContain("Christmas break");
  });
  it("flags papers and the next talk among the deadlines", () => {
    expect(out).toContain("- 2026-12-10 [paper] Response to reviewers (Paper)");
    expect(out).toContain("- 2027-02-01 [talk] Group seminar");
  });
  it("builds a filename", () => {
    expect(md.filename(2026, "2026-11-05")).toBe("academic-year-2026-27-overview-2026-11-05.md");
  });
});
