import { describe, it, expect } from "vitest";
import exporter from "../overviewExport";

const model = {
  title: "Academic year 2026/27 <overview>",
  subtitle: "Exported 2026-11-05",
  width: 1200,
  months: [{ left: 0, width: 8.2, label: "Sep", current: false }, { left: 8.2, width: 8.5, label: "Oct", current: true }],
  load: [{ left: 0, width: 10, level: 0 }, { left: 10, width: 10, level: 4 }],
  away: [{ left: 20, width: 5, title: "Holiday" }],
  todayPct: 12,
  lanes: [
    { name: "Projects", color: "", virtual: true, rows: 2, bars: [{ left: 0, width: 40, row: 0, title: "Al-pair & MFI", color: "#2fb590", kind: "block" }, { left: 5, width: 10, row: 1, title: "Phase", color: "#2fb590", kind: "block", isPhase: true, status: "active" }] },
    { name: "Research", color: "#5e6ef2", virtual: false, rows: 1, bars: [{ left: 50, width: 0.3, row: 0, title: "Congress", color: "#d9578c", kind: "milestone" }] },
  ],
  footer: "LatticeTodo",
};

describe("overviewExport.buildSvg", () => {
  const { svg, width, height } = exporter.buildSvg(model);
  it("returns a well-formed svg with the requested width", () => {
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(width).toBe(1200);
    expect(height).toBeGreaterThan(150);
  });
  it("escapes text", () => {
    expect(svg).toContain("Academic year 2026/27 &lt;overview&gt;");
    expect(svg).toContain("Al-pair &amp; MFI");
    expect(svg).not.toContain("<overview>");
  });
  it("draws bars, milestone, away band, load strip and today line", () => {
    expect(svg).toContain("Congress");
    expect(svg).toContain('fill-opacity="0.14"');
    expect(svg).toContain("#5e6ef2");
    expect((svg.match(/<clipPath/g) || []).length).toBe(2);
  });
});

describe("overviewExport.pdfFromJpeg", () => {
  it("wraps a jpeg in a valid single-page pdf", () => {
    let jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    let pdf = exporter.pdfFromJpeg(jpeg, { width: 1600, height: 700 });
    let text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/Width 1600 /Height 700");
    // startxref must point at the "xref" keyword
    let m = text.match(/startxref\n(\d+)/);
    expect(text.slice(Number(m[1]), Number(m[1]) + 4)).toBe("xref");
    // every xref offset must point at "N 0 obj"
    let entries = [...text.matchAll(/(\d{10}) 00000 n/g)].map((x) => Number(x[1]));
    entries.forEach((off, i) => expect(text.slice(off, off + 7)).toBe(i + 1 + " 0 obj"));
  });
  it("builds filenames", () => {
    expect(exporter.filename("2026/27", "png", "2026-11-05T12:00:00")).toBe("academic-year-2026-27-overview-2026-11-05.png");
  });
});
