import { describe, expect, it } from "vitest";
import { WalkCycle, STRIDE_HOLD, TILE_STEP_MS, TURN_MS } from "@/game/art/walkCycle";

describe("WalkCycle", () => {
  it("alternates the leading foot from tile to tile", () => {
    const c = new WalkCycle();
    expect([c.step(), c.step(), c.step(), c.step()]).toEqual([
      "right",
      "left",
      "right",
      "left",
    ]);
  });

  it("plays stride then neutral within a single tile", () => {
    const c = new WalkCycle();
    // One tile is one full step: lead on a stride, settle onto the passing pose.
    expect(c.step()).toBe("right");
    expect(c.frame).toBe("right");
    expect(c.rest()).toBe("both");
    expect(c.frame).toBe("both");
  });

  it("keeps foot parity across the neutral beat", () => {
    // The regression this guards: if resting reset parity, every tile would
    // lead with the same foot and a walk would never alternate.
    const c = new WalkCycle();
    c.step();
    c.rest();
    expect(c.step()).toBe("left");
    c.rest();
    expect(c.step()).toBe("right");
  });

  it("starts and stays at rest until the first step", () => {
    const c = new WalkCycle();
    expect(c.frame).toBe("both");
    expect(c.rest()).toBe("both");
    expect(c.frame).toBe("both");
  });

  it("settles partway through the tile, not at its end", () => {
    // A settle at or past the full tile would never render — the next tile's
    // stride would overwrite it, which is exactly the glide bug side-on.
    expect(STRIDE_HOLD).toBeGreaterThan(0);
    expect(STRIDE_HOLD).toBeLessThan(1);
    expect(TILE_STEP_MS * STRIDE_HOLD).toBeLessThan(TILE_STEP_MS);
  });

  it("turns in place faster than it walks a tile", () => {
    expect(TURN_MS).toBeLessThan(TILE_STEP_MS);
  });
});
