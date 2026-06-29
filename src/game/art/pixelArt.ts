import * as Phaser from "phaser";

/**
 * Pixel-art baker — turns a small grid of palette chars into a Phaser texture.
 *
 * Each art piece is authored as an array of equal-ish-length strings; every
 * character maps to a colour in its palette (or to transparent). Rows shorter
 * than the widest row are right-padded with transparent pixels so a miscount
 * never crashes the boot — it just renders a gap we can spot and fix.
 *
 * Native resolution is intentionally tiny (≈16px) — the chunky pixels ARE the
 * Pokémon-FireRed look once the camera scales them up with `pixelArt: true`.
 */

export type Palette = Record<string, string | null>;

export interface PixelArt {
  rows: string[];
  palette: Palette;
  /**
   * Optional FireRed-style silhouette outline. When set, every transparent
   * pixel touching an opaque pixel (4-neighbour) is painted this colour, giving
   * props and characters a clean dark edge. Tiles that must seamlessly repeat
   * (floor/wall) leave this unset.
   */
  outline?: string;
}

/** Bake one pixel-art definition into a CanvasTexture under `key` (idempotent). */
export function bakePixelArt(
  scene: Phaser.Scene,
  key: string,
  art: PixelArt,
): void {
  if (scene.textures.exists(key)) return;

  const height = art.rows.length;
  const width = art.rows.reduce((max, r) => Math.max(max, r.length), 0);

  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();

  const isOpaque = (x: number, y: number): boolean => {
    if (y < 0 || y >= height || x < 0 || x >= (art.rows[y]?.length ?? 0)) {
      return false;
    }
    return !!art.palette[art.rows[y][x]];
  };

  // Pass 1: fills.
  for (let y = 0; y < height; y++) {
    const row = art.rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = art.palette[row[x]];
      if (!color) continue; // undefined char or explicit null = transparent
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Pass 2: auto-outline into the transparent ring around the silhouette.
  if (art.outline) {
    ctx.fillStyle = art.outline;
    for (let y = 0; y < height; y++) {
      const row = art.rows[y];
      for (let x = 0; x < width; x++) {
        if (isOpaque(x, y)) continue; // only fill empty pixels
        const touchesArt =
          isOpaque(x - 1, y) ||
          isOpaque(x + 1, y) ||
          isOpaque(x, y - 1) ||
          isOpaque(x, y + 1);
        if (touchesArt) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  tex.refresh();
}

/**
 * Bake a soft elliptical contact shadow into a CanvasTexture. Placed under the
 * character and props so they sit on the floor instead of floating — a small
 * but defining FireRed detail.
 */
export function bakeShadow(
  scene: Phaser.Scene,
  key: string,
  width = 16,
  height = 8,
  maxAlpha = 0.3,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();

  const cx = width / 2;
  const cy = height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, height / width); // squash the circle into an ellipse
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, width / 2);
  grad.addColorStop(0, `rgba(13,13,13,${maxAlpha})`);
  grad.addColorStop(0.7, `rgba(13,13,13,${maxAlpha * 0.6})`);
  grad.addColorStop(1, "rgba(13,13,13,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  tex.refresh();
}
