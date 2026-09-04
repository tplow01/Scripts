"use client";

import { useEffect, useState } from "react";

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
 * One horizontally-scrolling parallax band. The source art is authored at double
 * the container width and tiles seamlessly, so translating the image by -50% of
 * its own width (one container width) and looping is invisible. Farther layers
 * get a longer `duration` so they drift slower than the road in front.
 */
function ParallaxLayer({ src, duration, z }: { src: string; duration: string; z: number }) {
  // Each copy is sized by HEIGHT only (width auto), so the art keeps its aspect
  // ratio on every screen — never stretched or squished. The band art is wider
  // than any container, so two copies laid end to end always cover the frame;
  // sliding the flex track by -50% (exactly one copy) loops seamlessly.
  const img = { height: "100%", width: "auto" as const, flex: "none" as const, display: "block" as const };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: z }}>
      <div
        className="scripts-parallax"
        style={{ position: "absolute", top: 0, left: 0, height: "100%", display: "flex", width: "max-content", animationDuration: duration }}
      >
        <img src={src} alt="" style={img} />
        <img src={src} alt="" style={img} />
      </div>
    </div>
  );
}

/** Sunset skyline tableau for the SCR!PTS title screen — a drifting pixel-art city over a highway. */
export default function PixelCityIntro() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#f38bb9" }}>
      <style>{`
        @keyframes scripts-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
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
      <ParallaxLayer src="/assets/loading/layer-clouds.png" duration="90s" z={3} />

      {/* Solid ground behind the skyline + road. The buildings and road art abut
          exactly (same dark, adjacent rows) but upscaling their shared edge can
          leave a 1px translucent seam; this backs it so no sky bleeds through. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "60%", bottom: 0, zIndex: 4, background: "#2a221e" }} />

      <ParallaxLayer src="/assets/loading/layer-buildings.png" duration="34s" z={5} />
      <ParallaxLayer src="/assets/loading/layer-road.png" duration="13s" z={6} />

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
