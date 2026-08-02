/**
 * The SCR!PTS cast — the ONLY place that knows which characters exist and how
 * their frames are named.
 *
 * Every character is hand-drawn and imported by `scripts/import-sprites.py`
 * into `/assets/<id>/<id>-<facing>-<foot>.png`: 4 facings x 3 frames, 64px,
 * bottom-centre anchored on a shared content height so the cast is one size.
 * Left and right are distinct art — never flip-mirror a character.
 */

export type Facing = "down" | "up" | "left" | "right";
/** Walk-cycle frame: a stride on one foot, or the neutral standing pose. */
export type Foot = "left" | "both" | "right";
export type CharacterId = "scribbs" | "heath" | "teo" | "tp" | "karl";

export const CHARACTER_IDS = ["scribbs", "heath", "teo", "tp", "karl"] as const;
export const FACINGS = ["down", "up", "left", "right"] as const;
export const FEET = ["left", "both", "right"] as const;

/** Texture key for one frame — also the world-data `artKey` for a static NPC. */
export const characterFrame = (id: CharacterId, facing: Facing, foot: Foot): string =>
  `${id}-${facing}-${foot}`;

/** Where BootScene loads that frame from. */
export const characterFramePath = (id: CharacterId, facing: Facing, foot: Foot): string =>
  `/assets/${id}/${characterFrame(id, facing, foot)}.png`;

const FRAME_KEYS = new Set<string>(
  CHARACTER_IDS.flatMap((id) => FACINGS.flatMap((f) => FEET.map((foot) => characterFrame(id, f, foot)))),
);

/** True when a texture key names a character frame (rather than a prop). */
export const isCharacterFrame = (key: string): boolean => FRAME_KEYS.has(key);

/** Split a frame key back into its parts; null when it isn't a character frame. */
export function parseCharacterFrame(
  key: string,
): { id: CharacterId; facing: Facing; foot: Foot } | null {
  if (!FRAME_KEYS.has(key)) return null;
  const [id, facing, foot] = key.split("-");
  return { id: id as CharacterId, facing: facing as Facing, foot: foot as Foot };
}

/** Every (id, facing, foot) triple, for BootScene's preload loop. */
export function* allCharacterFrames(): Generator<{ id: CharacterId; facing: Facing; foot: Foot }> {
  for (const id of CHARACTER_IDS) {
    for (const facing of FACINGS) {
      for (const foot of FEET) yield { id, facing, foot };
    }
  }
}
