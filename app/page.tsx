"use client";

import dynamic from "next/dynamic";

// Phaser is client-only — never server-rendered.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-ink">
      <PhaserGame />
    </main>
  );
}
