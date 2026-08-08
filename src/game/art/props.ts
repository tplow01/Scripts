/**
 * Standalone one-tile props drawn by hand — the ONLY place that knows which
 * single-tile props are authored PNGs rather than baked pixel art.
 *
 * Unlike the walls, rails, counter and sofa, these don't stitch into a run:
 * each is one self-contained tile, so it needs no slice order, just a key and
 * a path (see `scripts/import-fixtures.py`).
 *
 *   box       — the Basement's stacked, taped-up carton (drawn on its grey floor)
 *   box-open  — the shop's open carton, filling the corner where the two
 *               clothing rails meet (drawn on the shop's off-white floor)
 *   vinyl-crate — the record crate; one either side of the vinyl desk, so the
 *               music alcove reads as a matched pair
 *   speaker   — the alcove's monitors, flanking the deck
 *   stairs-shop     — the Shop's secret staircase down, drawn head-on
 *   stairs-basement — the Basement's staircase back up, drawn side-on against
 *                     its left wall. Two distinct sprites, so two keys.
 */

export const PROP_IDS = [
  "box",
  "box-open",
  "vinyl-crate",
  "speaker",
  "stairs-shop",
  "stairs-basement",
] as const;

export type PropId = (typeof PROP_IDS)[number];

/** Where BootScene loads a prop from. The id doubles as its texture key. */
export const propPath = (id: PropId): string => `/assets/props/${id}.png`;

const PROP_KEYS = new Set<string>(PROP_IDS);

/** True when a texture key names an authored one-tile prop. */
export const isAuthoredProp = (key: string): boolean => PROP_KEYS.has(key);
