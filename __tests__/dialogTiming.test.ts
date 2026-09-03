import { describe, it, expect } from "vitest";
import { nextDelay, TYPE_BASE_MS, TYPE_FF_MS, PUNCT_PAUSE_MS } from "@/lib/dialogTiming";

describe("nextDelay", () => {
  it("uses the base rate between ordinary characters", () => {
    expect(nextDelay("a", "b", false)).toBe(TYPE_BASE_MS);
  });

  it("adds a pause after sentence punctuation", () => {
    for (const p of [".", "!", "?", "…"]) {
      expect(nextDelay(p, "A", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
    }
  });

  it("pauses after punctuation even when the next char is a space", () => {
    expect(nextDelay(".", " ", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
  });

  it("does not pause mid-ellipsis (dot followed by dot)", () => {
    expect(nextDelay(".", ".", false)).toBe(TYPE_BASE_MS);
  });

  it("pauses at end of string after punctuation", () => {
    expect(nextDelay("?", "", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
  });

  it("does not pause after a comma or a letter", () => {
    expect(nextDelay(",", " ", false)).toBe(TYPE_BASE_MS);
    expect(nextDelay("t", "e", false)).toBe(TYPE_BASE_MS);
  });

  it("fast-forwards to a flat rate while held, ignoring punctuation pauses", () => {
    expect(nextDelay("a", "b", true)).toBe(TYPE_FF_MS);
    expect(nextDelay(".", "A", true)).toBe(TYPE_FF_MS);
  });
});
