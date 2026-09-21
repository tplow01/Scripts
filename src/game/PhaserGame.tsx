"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

/**
 * Client-only mount point for the Phaser game. Phaser and its scenes are
 * dynamically imported inside the effect so they never run during SSR.
 *
 * The container fills its parent (the Game Boy LCD), not the viewport, so the
 * world renders inside the handheld screen. `onGame` hands the created game back
 * to the shell so on-screen controls can drive it via the "vbutton" event.
 */
export default function PhaserGame({
  onGame,
}: {
  onGame?: (game: Phaser.Game) => void;
}) {
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
      onGame?.(game);
    })();

    return () => {
      destroyed = true;
      try {
        game?.destroy(true);
      } catch {
        // A game torn down mid-boot can throw from its own teardown; the page
        // is leaving anyway and a fresh game is built on return.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="group"
      aria-label="SCR!PTS game world. Move with the arrow keys or the on-screen buttons. The shop is also available from the Inventory button."
    />
  );
}
