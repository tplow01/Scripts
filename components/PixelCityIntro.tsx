"use client";

import type { CSSProperties } from "react";

const block = (style: CSSProperties) => <span style={{ position: "absolute", imageRendering: "pixelated", ...style }} />;

function Walker({ left, delay, hair, jacket }: { left: string; delay: string; hair: string; jacket: string }) {
  return (
    <div className="scripts-walker" style={{ position: "absolute", left, bottom: "15%", width: 34, height: 58, animationDelay: delay }}>
      {block({ left: 8, top: 0, width: 20, height: 8, background: hair })}
      {block({ left: 5, top: 5, width: 26, height: 11, background: hair, clipPath: "polygon(0 40%,20% 0,40% 30%,60% 0,100% 45%,88% 100%,8% 100%)" })}
      {block({ left: 9, top: 13, width: 18, height: 13, background: "#D99570" })}
      {block({ left: 6, top: 25, width: 25, height: 21, background: jacket })}
      {block({ left: 3, top: 28, width: 5, height: 17, background: "#1B1822" })}
      {block({ left: 30, top: 28, width: 5, height: 17, background: "#1B1822" })}
      {block({ left: 10, top: 46, width: 7, height: 10, background: "#222832" })}
      {block({ left: 22, top: 46, width: 7, height: 10, background: "#222832" })}
      {block({ left: 7, top: 55, width: 11, height: 3, background: "#0D0D0D" })}
      {block({ left: 21, top: 55, width: 11, height: 3, background: "#0D0D0D" })}
      {block({ left: 3, top: 16, width: 5, height: 8, background: "#FF8AC7" })}
      {block({ left: 29, top: 16, width: 5, height: 8, background: "#FF4FA3" })}
      {block({ left: 7, top: 13, width: 24, height: 3, borderTop: "2px solid #FF8AC7" })}
    </div>
  );
}

/** Original looping pixel-city tableau for the SCR!PTS title screen. */
export default function PixelCityIntro() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(#090812 0 54%, #17131e 54% 100%)" }}>
      <style>{`
        @keyframes scripts-city-drift { from { transform: translateX(0) } to { transform: translateX(-96px) } }
        @keyframes scripts-walk-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes scripts-rain { from { transform: translateY(-30px) } to { transform: translateY(50px) } }
        @keyframes scripts-train { from { transform: translateX(-35vw) } to { transform: translateX(110vw) } }
        .scripts-walker { animation: scripts-walk-bob .42s steps(2,end) infinite; filter: drop-shadow(0 5px 0 rgba(0,0,0,.35)); }
        .scripts-rain { animation: scripts-rain .72s linear infinite; }
        .scripts-train { animation: scripts-train 11s linear infinite; }
      `}</style>

      <div style={{ position: "absolute", inset: "8% -96px 35% 0", display: "flex", gap: 8, animation: "scripts-city-drift 13s linear infinite" }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} style={{ width: 92 + (i % 3) * 18, height: `${64 + (i % 4) * 9}%`, alignSelf: "flex-end", background: i % 2 ? "#171522" : "#201a2a", borderTop: "4px solid #33273d", position: "relative", flexShrink: 0 }}>
            {Array.from({ length: 12 }, (_, j) => (
              <span key={j} style={{ position: "absolute", width: 5, height: 7, left: 12 + (j % 4) * 19, top: 15 + Math.floor(j / 4) * 18, background: (i + j) % 4 ? "#4b3d58" : "#FFB36C", boxShadow: (i + j) % 5 === 0 ? "0 0 8px #FF8AC7" : "none" }} />
            ))}
          </div>
        ))}
      </div>

      <div className="scripts-train" style={{ position: "absolute", left: 0, top: "43%", width: 210, height: 18, background: "#2C2935", borderTop: "2px solid #6F6F73", borderBottom: "3px solid #0D0D0D" }}>
        {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ position: "absolute", left: 8 + i * 25, top: 4, width: 13, height: 7, background: i % 3 ? "#8C708A" : "#FF8AC7" }} />)}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(#23202a 0 8%, #121117 8% 100%)", borderTop: "3px solid #6F6F73" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "13%", height: 2, background: "repeating-linear-gradient(90deg,#FF8AC7 0 24px,transparent 24px 54px)", opacity: .35 }} />
      <div style={{ position: "absolute", left: "7%", right: "7%", bottom: "9%", height: "7%", background: "repeating-linear-gradient(90deg,rgba(255,138,199,.22) 0 18px,rgba(109,177,220,.05) 18px 40px)", transform: "skewX(-20deg)", filter: "blur(1px)" }} />

      <Walker left="43%" delay="0s" hair="#211B29" jacket="#F7F7F5" />
      <Walker left="51%" delay="-.21s" hair="#775038" jacket="#0D0D0D" />

      <div className="scripts-rain" style={{ position: "absolute", inset: "-40px 0 0", opacity: .27, backgroundImage: "repeating-linear-gradient(105deg,transparent 0 31px,rgba(190,221,255,.9) 32px 33px,transparent 34px 68px)", backgroundSize: "68px 68px" }} />
    </div>
  );
}
