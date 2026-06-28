"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

/**
 * Client-only mount point for the Phaser game. Phaser and its scenes are
 * dynamically imported inside the effect so they never run during SSR.
 */
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | undefined;
    let destroyed = false;

    (async () => {
      const PhaserModule = await import("phaser");
      // Phaser ships as CJS/UMD — the constructor may sit on the namespace or .default.
      const PhaserNS = (PhaserModule as { default?: typeof Phaser }).default ?? PhaserModule;
      const { createGameConfig } = await import("@/game/config");
      if (destroyed || !containerRef.current) return;
      game = new PhaserNS.Game(createGameConfig(containerRef.current));
    })();

    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
