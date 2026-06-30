"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import GameBoyShell, { type Btn } from "@/components/GameBoyShell";
import StartScreen from "@/components/StartScreen";
import DialogPrompt from "@/components/DialogPrompt";
import { useCart } from "@/lib/cart";
import { gameSession } from "@/lib/gameSession";

// In-world fixtures that open a Yes/No prompt, and what "Yes" does. Keyed by
// interaction id first, then type — so the basement NPC routes differently from
// the lobby cashier even though both are "npc".
type PromptKind = "inventory" | "cart" | "basement";

// A prompt is either a Yes/No navigation choice or a multi-page NPC message.
type PromptDef =
  | { variant: "choice"; question: string; kind: PromptKind }
  | { variant: "message"; pages: string[] };

// Open prompt state (message prompts also track the current page via `page`).
type ActivePrompt =
  | { variant: "choice"; question: string; kind: PromptKind }
  | { variant: "message"; pages: string[] };

const PROMPTS: Record<string, PromptDef> = {
  // Lobby (by type)
  rack: { variant: "choice", question: "View the inventory?", kind: "inventory" },
  checkout: { variant: "choice", question: "Open your cart?", kind: "cart" },
  // Lobby cashier NPC (by id) — speech, no navigation.
  cashier: {
    variant: "message",
    pages: ["Yo! Take your time looking around.", "When you're ready, bring your pieces to the counter."],
  },
  // Floor shoppers (by id) — flavour speech, no navigation.
  "npc-rail": {
    variant: "message",
    pages: ["These just dropped this morning.", "Heavier than they look — there's proper weight to 'em."],
  },
  "npc-gazer": {
    variant: "message",
    pages: ["Green or white… I genuinely can't choose.", "…might just get both. Don't tell my bank."],
  },
  "npc-sofa": {
    variant: "message",
    pages: [
      "Best seat in the house.",
      "Throw a record on and take a load off.",
      "…they say the right record opens more than your ears. Try the decks.",
    ],
  },
  "npc-checkout": {
    variant: "message",
    pages: ["Just copped the RAGE tee.", "Staff here are sound — the line moves quick."],
  },
  // Basement (by id — overrides the "rack" type so it routes to the pieces page)
  "basement-npc": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
  "rail-top": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
  "rail-left": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
  "rail-right": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
};

// Welcome message on genuine first entry (after the door-walk intro).
const WELCOME_PAGES = [
  "Welcome to SCR!PTS — a home for creative culture!",
  "Walk up to a rack and press A to take a look. The counter checks you out.",
];

// Routes reachable from the game — prefetched on start so navigation is instant.
const GAME_ROUTES = ["/inventory", "/basement", "/cart"];

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

/**
 * True when the on-screen Game Boy controls should show: any touch-input device
 * (phones, tablets, touch laptops) or a viewport ≤1024px. Mouse-driven desktops
 * keep the full-bleed bezel. null until mounted.
 */
function useIsMobile(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px), (pointer: coarse)");
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
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);
  const [sel, setSel] = useState<"yes" | "no">("yes");
  const [page, setPage] = useState(0); // current page of an open message prompt

  // Set once the Phaser game exists; forwards on-screen buttons into the scene.
  const pressRef = useRef<(code: string) => void>(() => {});
  const gameRef = useRef<Phaser.Game | null>(null);
  // Latest interaction handler (the game subscribes once, but this closure
  // needs current router/cart/state each render).
  const interactionRef = useRef<(hit: { id: string; type: string }) => void>(() => {});
  interactionRef.current = (hit) => {
    // The vinyl deck is the secret switch: first play reveals the hidden
    // basement entrance; afterwards it's just an idle line.
    if (hit.id === "vinyl") {
      const revealed = gameSession.revealed.has("basement-entrance");
      setSel("yes");
      setPage(0);
      if (!revealed) {
        gameRef.current?.events.emit("reveal", "basement-entrance");
        setPrompt({
          variant: "message",
          pages: [
            "You thumb through a crate of records…",
            "One sticks. You pull it — and a panel by the wall slides aside.",
          ],
        });
      } else {
        setPrompt({ variant: "message", pages: ["The record's still spinning."] });
      }
      gameRef.current?.events.emit("dialog", true);
      return;
    }
    const p = PROMPTS[hit.id] ?? PROMPTS[hit.type];
    if (!p) return;
    setSel("yes");
    setPage(0);
    setPrompt(p);
    gameRef.current?.events.emit("dialog", true);
  };

  // Welcome message — fired once by the scene after the door-walk intro.
  const welcomeRef = useRef<() => void>(() => {});
  welcomeRef.current = () => {
    setPage(0);
    setPrompt({ variant: "message", pages: WELCOME_PAGES });
    gameRef.current?.events.emit("dialog", true);
  };

  const onGame = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    pressRef.current = (code: string) => game.events.emit("vbutton", code);
    game.events.on("interaction", (hit: { id: string; type: string }) => interactionRef.current(hit));
    game.events.on("welcome", () => welcomeRef.current());
  }, []);

  const toggleSel = useCallback(() => {
    setSel((s) => (s === "yes" ? "no" : "yes"));
  }, []);

  const closePrompt = useCallback(() => {
    setPrompt(null);
    setPage(0);
    gameRef.current?.events.emit("dialog", false);
  }, []);

  // Advance an open message prompt; close after its last page.
  const advanceMessage = useCallback(() => {
    if (!prompt || prompt.variant !== "message") return;
    if (page < prompt.pages.length - 1) setPage(page + 1);
    else closePrompt();
  }, [prompt, page, closePrompt]);

  const choose = useCallback(
    (choice: "yes" | "no") => {
      const kind = prompt?.variant === "choice" ? prompt.kind : undefined;
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
      // Dialogue open: controls drive the prompt, not Scribbs.
      if (prompt) {
        if (prompt.variant === "message") {
          // Speech: A / B / START advance pages, then dismiss. Arrows do nothing.
          if (b === "A" || b === "B" || b === "START") advanceMessage();
        } else if (b === "up" || b === "down" || b === "left" || b === "right") {
          toggleSel();
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
    [prompt, sel, choose, started, advanceMessage, toggleSel],
  );

  // In-memory session survives client-side back-navigation (game → inventory →
  // back) but not a hard refresh. So: returning resumes mid-game; a fresh page
  // load shows the start screen.
  useEffect(() => {
    if (gameSession.playing) setStarted(true);
  }, []);

  // Once playing: remember it (so back-nav resumes) and prefetch the reachable
  // routes so rack/checkout/NPC handoffs are instant.
  useEffect(() => {
    if (!started) return;
    gameSession.playing = true;
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
      if (prompt.variant === "message") {
        // Speech: confirm/cancel keys advance pages; arrows ignored.
        if (["Enter", "KeyZ", "Space", "KeyX", "Escape"].includes(e.code)) {
          e.preventDefault();
          advanceMessage();
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
        toggleSel();
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
  }, [prompt, sel, choose, advanceMessage, toggleSel]);

  // Avoid a hydration flash before we know the layout.
  if (mobile === null) {
    return <main className="h-screen w-screen bg-ink" />;
  }

  const screen = started ? (
    <>
      <PhaserGame onGame={onGame} />
      {prompt && (prompt.variant === "message" ? (
        <DialogPrompt variant="message" text={prompt.pages[page]} onAdvance={advanceMessage} />
      ) : (
        <DialogPrompt variant="choice" text={prompt.question} sel={sel} onChoose={choose} />
      ))}
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
