import { describe, it, expect } from "vitest";
import projectLogMarkdown from "../projectLogMarkdown";

const NOW = "2026-11-05";
const project = { listName: "Al-pair stability in MFI", startDate: "2026-09-01", endDate: "2026-12-15" };
const phases = [
  { id: "b", name: "MACE L1 | training", startDate: "2026-10-01", endDate: "2026-11-20", status: "active", order: 1 },
  { id: "a", name: "Benchmark DFT", startDate: "2026-09-01", endDate: "2026-09-30", status: "done", order: 0 },
];
const entries = [
  { id: "1", date: "2026-10-20", kind: "decision", text: "Move to MACE L1,\nL0 insufficient", phaseId: "b" },
  { id: "2", date: "2026-09-25", kind: "milestone", text: "Benchmark closed", phaseId: "a" },
  { id: "3", date: "2026-11-03", kind: "block", text: "Queue full" },
  { id: "4", date: "2026-10-28", kind: "block", text: "Maintenance", blockEndDate: "2026-11-02" },
];

describe("projectLogMarkdown.build", () => {
  const md = projectLogMarkdown.build(project, phases, entries, NOW);

  it("starts with the project title and a summary", () => {
    expect(md.startsWith("# Al-pair stability in MFI: timeline and log")).toBe(true);
    expect(md).toContain("- Phases: 2 (1 done, 1 active)");
    expect(md).toContain("- Log entries: 4 (1 milestone, 1 decision, 2 blocks)");
    expect(md).toContain("- Open blocks: 1");
  });

  it("orders phases by their order field and escapes pipes in the table", () => {
    expect(md.indexOf("Benchmark DFT")).toBeLessThan(md.indexOf("MACE L1"));
    expect(md).toContain("MACE L1 \\| training");
  });

  it("emits a mermaid gantt with phases, blocks and milestones", () => {
    expect(md).toContain("```mermaid\ngantt");
    expect(md).toContain("Benchmark DFT :done, ph1, 2026-09-01, 30d");
    expect(md).toContain(":crit, bl4, 2026-11-03, 3d");
    expect(md).toContain(":milestone, ms1, 2026-09-25, 0d");
  });

  it("lists the log chronologically grouped by month, with kind, phase and block state", () => {
    expect(md.indexOf("### 2026-09")).toBeLessThan(md.indexOf("### 2026-10"));
    expect(md).toContain("- 2026-09-25 [milestone] (Benchmark DFT) Benchmark closed");
    expect(md).toContain("- 2026-10-28 [block, until 2026-11-02] Maintenance");
    expect(md).toContain("- 2026-11-03 [block, ongoing] Queue full");
  });

  it("indents continuation lines of multi-line entries", () => {
    expect(md).toContain("Move to MACE L1,\n  L0 insufficient");
  });

  it("handles a project with no phases and no entries", () => {
    const empty = projectLogMarkdown.build({ listName: "Empty" }, [], [], NOW);
    expect(empty).toContain("No phases defined.");
    expect(empty).toContain("No log entries.");
    expect(empty).not.toContain("```mermaid");
  });

  it("ignores phases with unusable dates in the gantt", () => {
    const bad = projectLogMarkdown.build(project, [{ id: "x", name: "Broken", startDate: "", endDate: "", status: "pending", order: 0 }], [], NOW);
    expect(bad).not.toContain("```mermaid");
    expect(bad).toContain("| 1 | Broken |");
  });
});

describe("projectLogMarkdown.filename", () => {
  it("slugifies the name, drops accents and appends the date", () => {
    expect(projectLogMarkdown.filename("Estabilidad Al: MFI (ñ)!", NOW)).toBe("estabilidad-al-mfi-n-timeline-log-2026-11-05.md");
  });

  it("falls back to a generic name", () => {
    expect(projectLogMarkdown.filename("", NOW)).toBe("project-timeline-log-2026-11-05.md");
  });
});
