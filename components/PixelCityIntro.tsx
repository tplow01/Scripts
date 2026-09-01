"use client";

import { useEffect, useState } from "react";

/** In-game walk cycle: standing, left-leg-forward, standing, right-leg-forward. */
const WALK_FRAMES = ["both", "left", "both", "right"] as const;

function Walker({ character, delay }: { character: "scribbs" | "heath"; delay: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % WALK_FRAMES.length), 160);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="scripts-walker"
      style={{ position: "absolute", top: "58%", height: "24%", aspectRatio: "1", animationDelay: delay }}
    >
      <img
        src={`/assets/${character}/${character}-right-${WALK_FRAMES[frame]}.png`}
        alt=""
        style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
    </div>
  );
}

/** Sunset skyline tableau for the SCR!PTS title screen — a drifting pixel-art city over a highway. */
export default function PixelCityIntro() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#1a0f0a" }}>
      <style>{`
        @keyframes scripts-walk-across { from { left: -15% } to { left: 115% } }
        .scripts-walker { animation: scripts-walk-across 16s linear infinite; }
      `}</style>

      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/assets/loading/skyline.png)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        imageRendering: "pixelated",
      }} />

      <Walker character="scribbs" delay="0s" />
      <Walker character="heath" delay="-1.6s" />
    </div>
  );
}
