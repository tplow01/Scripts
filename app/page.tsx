"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import GameBoyShell, { type Btn } from "@/components/GameBoyShell";
import StartScreen from "@/components/StartScreen";
import DialogPrompt, { type DialogPromptHandle } from "@/components/DialogPrompt";
import { useCart } from "@/lib/cart";
import { gameSession } from "@/lib/gameSession";

// In-world fixtures that open a Yes/No prompt, and what "Yes" does. Keyed by
// interaction id first, then type — so the basement NPC routes differently from
// the lobby cashier even though both are "npc".
type PromptKind = "inventory" | "cart" | "basement";

// A prompt is a Yes/No navigation choice, a multi-page NPC message, or speech
// pages that END in a Yes/No choice (the basement NPC's secretive pitch).
// `speaker` names the nameplate tab above the box — omitted for system prompts
// (rack/checkout) and anonymous floor shoppers, who stay untagged.
type PromptDef =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: string[]; speaker?: string }
  | { variant: "messageChoice"; pages: string[]; question: string; kind: PromptKind; speaker?: string };

// Open prompt state (paged prompts also track the current page via `page`;
// a messageChoice at page === pages.length is in its choice phase).
type ActivePrompt = PromptDef;

const PROMPTS: Record<string, PromptDef> = {
  // Lobby (by type)
  rack: { variant: "choice", question: "View the inventory?", kind: "inventory" },
  // Heath physically walks over to ask this one (see WorldScene.playHeathCheckout).
  checkout: { variant: "choice", question: "Are you ready to checkout?", kind: "cart", speaker: "Heath" },
  // Lobby cashier NPC (by id) — the cashier IS Heath. Speech, no navigation.
  cashier: {
    variant: "message",
    speaker: "Heath",
    pages: ["Heath here — take your time looking around.", "When you're ready, bring your pieces to the counter."],
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
  // Down here the tone is hushed — you found the secret, after all.
  "basement-npc": {
    variant: "messageChoice",
    pages: ["Shhh… how did you find this place?", "…Well. Since you're already down here —"],
    question: "Check out my favourite pieces?",
    kind: "basement",
  },
  "rail-top": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
  "rail-left": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
  "rail-right": { variant: "choice", question: "Take a look at the pieces?", kind: "basement" },
};

// Heath's greeting on genuine first entry — he walks over from the counter to
// deliver it. {A} becomes the platform's interact button (A on mobile, Z on web).
const HEATH_INTRO_PAGES = [
  "Yo! Welcome to SCR!PTS — a home for creative culture. I'm Heath.",
  "Walk up to anything and press {A} to check it out.",
  "When you're ready, bring your pieces to the counter. I'll sort you out.",
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
  const { openCart, isOpen: cartIsOpen } = useCart();
  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);
  const [sel, setSel] = useState<"yes" | "no">("yes");
  const [page, setPage] = useState(0); // current page of an open message prompt

  // Set once the Phaser game exists; forwards on-screen buttons into the scene
  // with press/release semantics so a held D-pad arm keeps Scribbs walking.
  const pressRef = useRef<(code: string, down: boolean) => void>(() => {});
  const gameRef = useRef<Phaser.Game | null>(null);
  // The open dialogue box's typewriter — a press first snaps mid-typed text to
  // full, then the NEXT press actually advances (classic GBA text-box feel).
  const dialogRef = useRef<DialogPromptHandle>(null);
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

  // Heath's greeting — fired once by the scene when he reaches the player.
  const welcomeRef = useRef<() => void>(() => {});
  welcomeRef.current = () => {
    setPage(0);
    setPrompt({ variant: "message", pages: HEATH_INTRO_PAGES, speaker: "Heath" });
    gameRef.current?.events.emit("dialog", true);
  };

  const onGame = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    pressRef.current = (code: string, down: boolean) => game.events.emit("vbutton", code, down);
    game.events.on("interaction", (hit: { id: string; type: string }) => interactionRef.current(hit));
    game.events.on("welcome", () => welcomeRef.current());
    // Handshake: a fresh game (e.g. remounted after the inventory detour) must
    // never inherit a stale "dialog open" flag from a prompt the old game saw.
    game.events.emit("dialog", false);
    game.events.emit("cart", false);
  }, []);

  const toggleSel = useCallback(() => {
    setSel((s) => (s === "yes" ? "no" : "yes"));
  }, []);

  const closePrompt = useCallback(() => {
    setPrompt(null);
    setPage(0);
    gameRef.current?.events.emit("dialog", false);
  }, []);

  // Advance an open paged prompt. A plain message closes after its last page;
  // a messageChoice rolls onto its Yes/No question instead (page === length).
  const advanceMessage = useCallback(() => {
    if (!prompt || prompt.variant === "choice") return;
    if (dialogRef.current?.skipTyping()) return; // first press just finishes typing
    if (page < prompt.pages.length - 1) setPage(page + 1);
    else if (prompt.variant === "messageChoice" && page < prompt.pages.length) setPage(page + 1);
    else closePrompt();
  }, [prompt, page, closePrompt]);

  const choose = useCallback(
    (choice: "yes" | "no") => {
      const kind = prompt && prompt.variant !== "message" ? prompt.kind : undefined;
      closePrompt();
      if (choice === "no" || !kind) return;
      if (kind === "inventory") router.push("/inventory");
      else if (kind === "basement") router.push("/basement");
      else if (kind === "cart") openCart();
    },
    [prompt, closePrompt, router, openCart],
  );

  // True while an open prompt is showing speech pages (vs. its Yes/No phase).
  const inMessagePhase =
    !!prompt &&
    (prompt.variant === "message" ||
      (prompt.variant === "messageChoice" && page < prompt.pages.length));

  const handlePress = useCallback(
    (b: Btn) => {
      // Dialogue open: controls drive the prompt, not Scribbs.
      if (prompt) {
        if (inMessagePhase) {
          // Speech: A / B / START advance pages. Arrows do nothing.
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
      if (code) pressRef.current(code, true);
    },
    [prompt, inMessagePhase, sel, choose, started, advanceMessage, toggleSel],
  );

  // Released D-pad arm → stop the held walk. Only movement codes matter; while
  // a prompt is open the scene's held set is already cleared.
  const handleRelease = useCallback(
    (b: Btn) => {
      const code = CODE[b];
      if (code && started) pressRef.current(code, false);
    },
    [started],
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
      if (inMessagePhase) {
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
  }, [prompt, inMessagePhase, sel, choose, advanceMessage, toggleSel]);

  // Cart drawer state → game. Heath (WorldScene.playHeathCheckout) waits at the
  // till until the drawer closes, like a real cashier mid-transaction.
  useEffect(() => {
    gameRef.current?.events.emit("cart", cartIsOpen);
  }, [cartIsOpen]);

  // Avoid a hydration flash before we know the layout.
  if (mobile === null) {
    return <main className="h-dvh w-screen bg-ink" />;
  }

  // Swap {A} for the platform's interact button (mobile A button / desktop Z key).
  const btnify = (s: string) => s.replaceAll("{A}", mobile ? "A" : "Z");

  const screen = started ? (
    <>
      <PhaserGame onGame={onGame} />
      {prompt &&
        (prompt.variant === "choice" ||
        (prompt.variant === "messageChoice" && page >= prompt.pages.length) ? (
          <DialogPrompt
            ref={dialogRef}
            variant="choice"
            text={btnify(prompt.question)}
            speaker={prompt.speaker}
            sel={sel}
            onChoose={choose}
          />
        ) : (
          <DialogPrompt
            ref={dialogRef}
            variant="message"
            text={btnify(prompt.pages[page])}
            speaker={prompt.speaker}
            onAdvance={advanceMessage}
          />
        ))}
    </>
  ) : (
    <StartScreen mobile={mobile} onStart={() => setStarted(true)} />
  );

  return (
    <main className="h-dvh w-screen overflow-hidden">
      <GameBoyShell mobile={mobile} screen={screen} onPress={handlePress} onRelease={handleRelease} />
    </main>
  );
}
