"use client";

import { useEffect, useState } from "react";
import { PARALLAX_BANDS, PARALLAX_TILES, MIRROR_PERIOD, type ParallaxBand } from "@/lib/parallax";

/** In-game walk cycle: standing, left-leg-forward, standing, right-leg-forward. */
const WALK_FRAMES = ["both", "left", "both", "right"] as const;

/**
 * A character jogging on the spot in the centre of the frame. The legs cycle
 * through the walk sprites while the parallax world slides past behind them, so
 * they read as "walking" without ever leaving the middle of the screen.
 */
function Walker({ character, phase = 0 }: { character: "scribbs" | "heath"; phase?: number }) {
  const [frame, setFrame] = useState(phase % WALK_FRAMES.length);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % WALK_FRAMES.length), 160);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100%", aspectRatio: "1" }}>
      <img
        src={`/assets/${character}/${character}-right-${WALK_FRAMES[frame]}.png`}
        alt=""
        style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
    </div>
  );
}

/**
 * One horizontally-scrolling parallax band.
 *
 * The track is a strip of `PARALLAX_TILES` copies of the band's art. Its size
 * comes entirely from CSS — `height: 100%` plus an explicit `aspect-ratio`
 * built from the band's authored dimensions — so the strip is the right width
 * at first paint, before the PNG has decoded, and stays the right width even if
 * the PNG never arrives. (Deriving it from the bitmap, as this used to, left the
 * whole band 0px wide until the image loaded and blank forever if it failed.)
 * Each copy then takes an equal share of the strip via `flex: 1`, so a copy is
 * exactly `frameHeight × artRatio` wide with no intrinsic-size guesswork.
 *
 * Copies alternate normal / mirrored so every junction is a reflection: the art
 * does not tile with itself, and butting two identical copies together put a
 * hard vertical cut through the sky once per loop. Sliding the strip by exactly
 * `MIRROR_PERIOD` copies — `-200% / tiles` of its own width — returns it to an
 * identical arrangement, so the wrap is invisible.
 *
 * Farther bands get a longer `duration` so they drift slower than the road.
 */
function ParallaxLayer({ band, z }: { band: ParallaxBand; z: number }) {
  const tiles = PARALLAX_TILES;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: z }}>
      <div
        className="scripts-parallax"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          // The whole strip: `tiles` copies of the art laid end to end.
          aspectRatio: `${band.width * tiles} / ${band.height}`,
          display: "flex",
          animationDuration: band.duration,
          // Read by the shared keyframe: MIRROR_PERIOD copies out of `tiles`,
          // as a share of the strip's own width.
          ["--parallax-shift" as string]: `${(-100 * MIRROR_PERIOD) / tiles}%`,
        }}
      >
        {Array.from({ length: tiles }, (_, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              height: "100%",
              backgroundImage: `url(${band.src})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              // Every other copy is flipped, so each junction is a mirror line.
              transform: i % MIRROR_PERIOD === 1 ? "scaleX(-1)" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Sunset skyline tableau for the SCR!PTS title screen — a drifting pixel-art city over a highway. */
export default function PixelCityIntro() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#f38bb9" }}>
      <style>{`
        @keyframes scripts-scroll { from { transform: translateX(0) } to { transform: translateX(var(--parallax-shift)) } }
        @keyframes scripts-star-flicker { 0%, 100% { opacity: 0.9 } 45% { opacity: 0.35 } 70% { opacity: 1 } }
        .scripts-parallax { animation-name: scripts-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>

      {/* Back to front: flat sky bands, star flicker, drifting clouds, ground,
          skyline, road. The sky art is only horizontal bands, so mapping it
          1:1 to the frame can't distort anything. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          backgroundImage: "url(/assets/loading/layer-sky.png)",
          backgroundSize: "100% 100%",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          backgroundImage: "url(/assets/loading/layer-stars.png)",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          animation: "scripts-star-flicker 5s ease-in-out infinite",
        }}
      />

      {/* Clouds drift slowly and sit in front of the stars, so stars pass behind them. */}
      <ParallaxLayer band={PARALLAX_BANDS.clouds} z={3} />

      {/* Solid ground behind the skyline + road. The buildings and road art abut
          exactly (same dark, adjacent rows) but upscaling their shared edge can
          leave a 1px translucent seam; this backs it so no sky bleeds through. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "60%", bottom: 0, zIndex: 4, background: "#2a221e" }} />

      <ParallaxLayer band={PARALLAX_BANDS.buildings} z={5} />
      <ParallaxLayer band={PARALLAX_BANDS.road} z={6} />

      {/* Characters walking on the spot, dead centre. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "59%",
          transform: "translateX(-50%)",
          height: "22%",
          zIndex: 7,
          display: "flex",
          alignItems: "flex-end",
          gap: "6%",
        }}
      >
        <Walker character="scribbs" phase={0} />
        <Walker character="heath" phase={2} />
      </div>
    </div>
  );
}
