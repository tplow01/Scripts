import { allCharacterFrames, characterFrame, characterFramePath } from "@/game/art/characters";
import { allMuralTiles, muralTileKey, muralTilePath } from "@/game/art/walls";
import { FLOOR_IDS, allRugTiles, floorPath, rugTileKey, rugTilePath } from "@/game/art/floors";
import { allCheckoutTiles, checkoutTileKey, checkoutTilePath } from "@/game/art/checkout";
import { allSofaTiles, sofaTileKey, sofaTilePath } from "@/game/art/sofa";
import { allRailTiles, railTileKey, railTilePath } from "@/game/art/rails";
import { PROP_IDS, propPath } from "@/game/art/props";
import { allDeckTiles, deckTileKey, deckTilePath } from "@/game/art/vinylDeck";

/**
 * Every image the game loads up front, as { key, url } pairs.
 *
 * One list, two users: BootScene loads these into Phaser, and the start screen
 * warms the browser cache with the same URLs while the player is still reading
 * "CLICK TO START", so the black wait after clicking is mostly already done.
 * Keeping a single list means the two can never drift apart.
 *
 * What each group is (cast, murals, floors, counter, sofa, rails, props, deck)
 * is documented where BootScene used to build them inline — see the art modules.
 */
export function bootImages(): Array<{ key: string; url: string }> {
  const out: Array<{ key: string; url: string }> = [
    // Native 96px floor asset: exact 5x reduction of the 480px master.
    { key: "emblem", url: "/assets/logo-floor-96.png" },
  ];

  for (const { id, facing, foot } of allCharacterFrames()) {
    out.push({ key: characterFrame(id, facing, foot), url: characterFramePath(id, facing, foot) });
  }
  for (const { id, index } of allMuralTiles()) {
    out.push({ key: muralTileKey(id, index), url: muralTilePath(id, index) });
  }
  for (const id of FLOOR_IDS) out.push({ key: id, url: floorPath(id) });
  for (const index of allRugTiles()) out.push({ key: rugTileKey(index), url: rugTilePath(index) });
  for (const index of allCheckoutTiles()) {
    out.push({ key: checkoutTileKey(index), url: checkoutTilePath(index) });
  }
  for (const index of allSofaTiles()) out.push({ key: sofaTileKey(index), url: sofaTilePath(index) });
  for (const { id, index } of allRailTiles()) {
    out.push({ key: railTileKey(id, index), url: railTilePath(id, index) });
  }
  for (const id of PROP_IDS) out.push({ key: id, url: propPath(id) });
  for (const index of allDeckTiles()) out.push({ key: deckTileKey(index), url: deckTilePath(index) });

  return out;
}
