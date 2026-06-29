import { describe, it, expect } from "vitest";
import { mainRoom } from "@/game/world/mainRoom";
import { wallVariant } from "@/game/art/wallVariant";

describe("wallVariant (neighbour-based)", () => {
  const maxX = mainRoom.width - 1;
  const maxY = mainRoom.height - 1;

  it("caps a top wall whose face the player sees (floor below)", () => {
    expect(wallVariant(mainRoom, 5, 0)).toBe("wall-top");
  });

  it("uses the bottom wall where floor sits above", () => {
    expect(wallVariant(mainRoom, 5, maxY)).toBe("wall-bottom");
  });

  it("uses a side face on left/right columns with floor beside them", () => {
    expect(wallVariant(mainRoom, 0, 5)).toBe("wall-side"); // left wall, floor at (1,5)
    expect(wallVariant(mainRoom, maxX, 10)).toBe("wall-side"); // right wall by the bottom wing
  });

  it("fills fully-enclosed walls (corners with no floor neighbour)", () => {
    expect(wallVariant(mainRoom, 0, 0)).toBe("wall-fill");
  });

  it("caps the top-right cutout's bottom edge (floor below it)", () => {
    // Cutout is cols 8–15 × rows a–g (y1–7); (10,7) has floor at (10,8) below.
    expect(wallVariant(mainRoom, 10, 7)).toBe("wall-top");
  });
});
