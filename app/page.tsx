"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import GameBoyShell, { type Btn } from "@/components/GameBoyShell";
import StartScreen from "@/components/StartScreen";
import DialogPrompt from "@/components/DialogPrompt";
import { useCart } from "@/lib/cart";

// In-world fixtures that open a Yes/No prompt, and what "Yes" does. Keyed by
// interaction id first, then type — so the basement NPC routes differently from
// the lobby cashier even though both are "npc".
type PromptKind = "inventory" | "cart" | "basement";
const PROMPTS: Record<string, { question: string; kind: PromptKind }> = {
  // Lobby (by type)
  rack: { question: "View the inventory?", kind: "inventory" },
  checkout: { question: "Open your cart?", kind: "cart" },
  // Basement (by id — overrides the "rack" type so it routes to the pieces page)
  "basement-npc": { question: "Take a look at the pieces?", kind: "basement" },
  "rail-top": { question: "Take a look at the pieces?", kind: "basement" },
  "rail-left": { question: "Take a look at the pieces?", kind: "basement" },
  "rail-right": { question: "Take a look at the pieces?", kind: "basement" },
};

// Routes reachable from the game — prefetched on start so navigation is instant.
const GAME_ROUTES = ["/inventory", "/basement", "/cart"];
// Back buttons return to `/?play=1`, which re-enters the Lobby directly (no
// start screen, no door intro). A bare "/" always shows the start screen.

// Phaser is client-only — never server-rendered.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

// Semantic button → KeyboardEvent.code the WorldScene understands.
const CODE: Partial<Record<Btn, string>> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  A: "KeyZ", // interact / confirm
  B: "KeyX", // cancel
  START: "Enter",
};

/** True on phone-width screens (controls the Game Boy layout). null until mounted. */
function useIsMobile(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function Home() {
  const mobile = useIsMobile();
  const router = useRouter();
  const { openCart } = useCart();
  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState<{ question: string; kind: PromptKind } | null>(null);
  const [sel, setSel] = useState<"yes" | "no">("yes");

  // Set once the Phaser game exists; forwards on-screen buttons into the scene.
  const pressRef = useRef<(code: string) => void>(() => {});
  const gameRef = useRef<Phaser.Game | null>(null);
  // Latest interaction handler (the game subscribes once, but this closure
  // needs current router/cart/state each render).
  const interactionRef = useRef<(hit: { id: string; type: string }) => void>(() => {});
  interactionRef.current = (hit) => {
    const p = PROMPTS[hit.id] ?? PROMPTS[hit.type];
    if (!p) return;
    setSel("yes");
    setPrompt(p);
    gameRef.current?.events.emit("dialog", true);
  };

  const onGame = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    pressRef.current = (code: string) => game.events.emit("vbutton", code);
    game.events.on("interaction", (hit: { id: string; type: string }) => interactionRef.current(hit));
  }, []);

  const closePrompt = useCallback(() => {
    setPrompt(null);
    gameRef.current?.events.emit("dialog", false);
  }, []);

  const choose = useCallback(
    (choice: "yes" | "no") => {
      const kind = prompt?.kind;
      closePrompt();
      if (choice === "no" || !kind) return;
      if (kind === "inventory") router.push("/inventory");
      else if (kind === "basement") router.push("/basement");
      else if (kind === "cart") openCart();
    },
    [prompt, closePrompt, router, openCart],
  );

  const handlePress = useCallback(
    (b: Btn) => {
      // Dialogue open: controls drive the Yes/No, not Scribbs.
      if (prompt) {
        if (b === "up" || b === "down" || b === "left" || b === "right") {
          setSel((s) => (s === "yes" ? "no" : "yes"));
        } else if (b === "A" || b === "START") {
          choose(sel);
        } else if (b === "B") {
          choose("no");
        }
        return;
      }
      if (!started) {
        // Pre-game: A / START (and a tap, handled by StartScreen) begin play.
        if (b === "A" || b === "START") setStarted(true);
        return;
      }
      const code = CODE[b];
      if (code) pressRef.current(code);
    },
    [prompt, sel, choose, started],
  );

  // Returning from a web page (?play=1): skip the start screen + door intro and
  // drop straight back into the Lobby.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("play") === "1") {
      (window as unknown as { __scriptsSkipIntro?: boolean }).__scriptsSkipIntro = true;
      setStarted(true);
    }
  }, []);

  // Once playing: prefetch the reachable routes so rack/checkout/NPC handoffs
  // are instant.
  useEffect(() => {
    if (!started) return;
    GAME_ROUTES.forEach((r) => router.prefetch(r));
  }, [started, router]);

  // Desktop start gate: Enter / Space / Z begins play (Phaser owns keys after).
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (["Enter", "Space", "KeyZ"].includes(e.code)) setStarted(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  // Desktop keys while a Yes/No dialogue is open (Phaser ignores keys via the
  // "dialog" flag, so these don't also move Scribbs).
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
        setSel((s) => (s === "yes" ? "no" : "yes"));
      } else if (["Enter", "KeyZ", "Space"].includes(e.code)) {
        e.preventDefault();
        choose(sel);
      } else if (["KeyX", "Escape"].includes(e.code)) {
        e.preventDefault();
        choose("no");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt, sel, choose]);

  // Avoid a hydration flash before we know the layout.
  if (mobile === null) {
    return <main className="h-screen w-screen bg-ink" />;
  }

  const screen = started ? (
    <>
      <PhaserGame onGame={onGame} />
      {prompt && <DialogPrompt question={prompt.question} sel={sel} onChoose={choose} />}
    </>
  ) : (
    <StartScreen mobile={mobile} onStart={() => setStarted(true)} />
  );

  return (
    <main className="h-screen w-screen overflow-hidden">
      <GameBoyShell mobile={mobile} screen={screen} onPress={handlePress} />
    </main>
  );
}
