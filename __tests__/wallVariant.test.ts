import { describe, it, expect } from "vitest";
import { mainRoom } from "@/game/world/mainRoom";
import { wallVariant } from "@/game/art/wallVariant";

describe("wallVariant (neighbour-based)", () => {
  const maxX = mainRoom.width - 1;
  const maxY = mainRoom.height - 1;

  it("caps a top wall whose face the player sees (floor below)", () => {
    // Top wall is 4 thick: row 3 is the capped face, rows 0-2 fully enclosed.
    expect(wallVariant(mainRoom, 5, 3)).toBe("wall-top");
    expect(wallVariant(mainRoom, 5, 2)).toBe("wall-fill");
    expect(wallVariant(mainRoom, 5, 1)).toBe("wall-fill");
    expect(wallVariant(mainRoom, 5, 0)).toBe("wall-fill");
  });

  it("uses the bottom wall where floor sits above", () => {
    expect(wallVariant(mainRoom, 5, maxY)).toBe("wall-bottom");
  });

  it("uses a side face on left/right columns with floor beside them", () => {
    expect(wallVariant(mainRoom, 0, 5)).toBe("wall-side"); // left wall, floor at (1,5)
    // The right wall is 2 thick now: col 15 is the face, col 16 fully enclosed.
    expect(wallVariant(mainRoom, 15, 10)).toBe("wall-side"); // floor at (14,10)
    expect(wallVariant(mainRoom, maxX, 10)).toBe("wall-fill");
  });

  it("fills fully-enclosed walls (corners with no floor neighbour)", () => {
    expect(wallVariant(mainRoom, 0, 0)).toBe("wall-fill");
  });

  it("caps the top-right cutout's bottom edge (floor below it)", () => {
    // Cutout is cols 7–15 × rows a–h (y1–8); (10,8) has floor at (10,9) below.
    expect(wallVariant(mainRoom, 10, 8)).toBe("wall-top");
  });
});
