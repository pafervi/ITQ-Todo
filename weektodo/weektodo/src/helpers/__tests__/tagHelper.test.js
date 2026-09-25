import { describe, it, expect } from "vitest";
import tagHelper from "../tagHelper";

describe("tagHelper.colorForTag", () => {
  it("returns a valid hsl() color string", () => {
    expect(tagHelper.colorForTag("catalysis")).toMatch(/^hsl\(\d+, 55%, 48%\)$/);
  });

  it("is deterministic: the same tag always gets the same color", () => {
    expect(tagHelper.colorForTag("MFI")).toBe(tagHelper.colorForTag("MFI"));
  });

  it("gives different tags a different color in the common case", () => {
    expect(tagHelper.colorForTag("MFI")).not.toBe(tagHelper.colorForTag("DFT"));
  });
});
