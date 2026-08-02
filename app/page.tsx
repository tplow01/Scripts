"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import GameBoyShell, { type Btn } from "@/components/GameBoyShell";
import { KEY_TO_BTN } from "@/lib/controls";
import StartScreen from "@/components/StartScreen";
import DialogPrompt, { type DialogPromptHandle } from "@/components/DialogPrompt";
import { useCart } from "@/lib/cart";
import { gameSession } from "@/lib/gameSession";
import { CYBER_LOVE_PRODUCTS } from "@/lib/products";
import { useShellLayout } from "@/lib/useShellLayout";

// In-world fixtures that open a Yes/No prompt, and what "Yes" does. Keyed by
// interaction id first, then type — so the basement NPC routes differently from
// the lobby cashier even though both are "npc".
type PromptKind = "inventory" | "cart" | "basement";

// A prompt is a Yes/No navigation choice, a multi-page NPC message, or speech
// pages that END in a Yes/No choice (the basement NPC's secretive pitch).
// `speaker` names the nameplate tab above the box — omitted for system prompts
// (rack/checkout) and anonymous floor shoppers, who stay untagged.
type PromptPage = string | (() => string);

type PromptDef =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: PromptPage[]; speaker?: string }
  | { variant: "messageChoice"; pages: PromptPage[]; question: string; kind: PromptKind; speaker?: string };

// Open prompt state (paged prompts also track the current page via `page`;
// a messageChoice at page === pages.length is in its choice phase). Unlike
// PromptDef, an ActivePrompt's pages are always plain strings — any
// function-valued page (e.g. npc-checkout's random product line) is resolved
// ONCE, when the prompt opens, so an unrelated re-render (tapping MUTE while
// reading) can't re-roll it or restart the typewriter.
type ActivePrompt =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: string[]; speaker?: string }
  | { variant: "messageChoice"; pages: string[]; question: string; kind: PromptKind; speaker?: string };

// Resolve a page's text — plain string, or a function evaluated once here.
const pageText = (p: PromptPage) => (typeof p === "function" ? p() : p);

// Materialize a PromptDef into an ActivePrompt, resolving any function pages
// at open time rather than at render time.
const materialize = (p: PromptDef): ActivePrompt =>
  p.variant === "choice" ? p : { ...p, pages: p.pages.map(pageText) };

const PROMPTS: Record<string, PromptDef> = {
  // Lobby (by type)
  rack: { variant: "choice", question: "View the inventory?", kind: "inventory" },
  // Heath physically walks over to ask this one (see WorldScene.playHeathCheckout).
  // A quick word, then the Yes/No.
  checkout: {
    variant: "messageChoice",
    speaker: "Heath",
    pages: ["You find some dope pieces?"],
    question: "Checkout?",
    kind: "cart",
  },
  // Lobby cashier NPC (by id) — the cashier IS Heath. Speech, no navigation.
  cashier: {
    variant: "message",
    speaker: "Heath",
    pages: ["Heath here — take your time looking around.", "When you're ready, bring your pieces to the counter."],
  },
  // The cast on the shop floor (by id) — flavour speech, no navigation.
  teo: {
    variant: "message",
    speaker: "Teo",
    pages: [
      "These just dropped this morning.",
      "I think there's only a few pairs left though.",
      "There's so many sick pieces, I can't choose which one to get… might js have to get a few, don't tell my bank.",
    ],
  },
  tp: {
    variant: "message",
    speaker: "TP",
    pages: [
      () => {
        const p = CYBER_LOVE_PRODUCTS[Math.floor(Math.random() * CYBER_LOVE_PRODUCTS.length)];
        return `Just copped the ${p.emotion} tee.`;
      },
      "This spot is sweeeeeet! The staff is awesome and the pieces are sick!",
    ],
  },
  karl: {
    variant: "message",
    speaker: "Karl",
    pages: ["This pretty sick store huh? I'd check out the vinyls — some of my favorites in there."],
  },
  // Basement (by id — overrides the "rack" type so it routes to the pieces page).
  // This is Heath again, down in the secret room; the tone is hushed, because
  // you found the place you weren't supposed to.
  "basement-npc": {
    variant: "messageChoice",
    speaker: "Heath",
    pages: ["Shhh… how did you find this place?", "You have to check these pieces out, they are insane!"],
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
  "… Yooo. My name is Heath. I'm the founder of SCR!PTS. Welcome to our world!",
  "Walk up to anything and press {A} to check it out — {B} to go back.",
  "When you're ready, come back up — I'll check you out!",
];

// Routes reachable from the game — prefetched on start so navigation is instant.
const GAME_ROUTES = ["/inventory", "/basement", "/cart"];

// Phaser is client-only — never server-rendered.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

// KEY_TO_BTN is keyed by KeyboardEvent.key; arrows are verbatim ("ArrowUp") but
// letters are lowercase ("z"/"x"), so a Shift/CapsLock-held "Z" (e.key === "Z")
// still resolves — try the raw key first, then its lowercase form.
const keyToBtn = (e: KeyboardEvent): Btn | undefined => KEY_TO_BTN[e.key] ?? KEY_TO_BTN[e.key.toLowerCase()];

// Semantic button → KeyboardEvent.code the WorldScene understands.
const CODE: Partial<Record<Btn, string>> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  A: "KeyZ", // interact / confirm
  B: "KeyX", // cancel
};

export default function Home() {
  const layout = useShellLayout();
  const mobile = layout === null ? null : layout !== "desktop";
  const router = useRouter();
  const { openCart, isOpen: cartIsOpen } = useCart();
  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);
  const [sel, setSel] = useState<"yes" | "no">("yes");
  const [page, setPage] = useState(0); // current page of an open message prompt
  const [muted, setMuted] = useState(false);

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
        setPrompt(
          materialize({
            variant: "message",
            pages: [
              "You thumb through a crate of records…",
              "One sticks. You pull it — and a panel by the wall slides aside.",
            ],
          }),
        );
      } else {
        setPrompt(materialize({ variant: "message", pages: ["The record's still spinning."] }));
      }
      gameRef.current?.events.emit("dialog", true);
      return;
    }
    const p = PROMPTS[hit.id] ?? PROMPTS[hit.type];
    if (!p) return;
    setSel("yes");
    setPage(0);
    setPrompt(materialize(p));
    gameRef.current?.events.emit("dialog", true);
  };

  // Heath's greeting — fired once by the scene when he reaches the player.
  const welcomeRef = useRef<() => void>(() => {});
  welcomeRef.current = () => {
    setPage(0);
    setPrompt(materialize({ variant: "message", pages: HEATH_INTRO_PAGES, speaker: "Heath" }));
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
    game.events.emit("overlay", false);
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
          // Speech: A / B advance pages. Arrows do nothing.
          if (b === "A" || b === "B") advanceMessage();
        } else if (b === "up" || b === "down" || b === "left" || b === "right") {
          toggleSel();
        } else if (b === "A") {
          choose(sel);
        } else if (b === "B") {
          choose("no");
        }
        return;
      }
      if (!started) {
        // Pre-game: A (and a tap, handled by StartScreen) begins play.
        if (b === "A") setStarted(true);
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

  // Lock body scroll only while this game screen is mounted — inventory,
  // basement, cart, and checkout are normal scrolling pages and must not
  // inherit the fixed/no-scroll shell treatment.
  useEffect(() => {
    document.body.classList.add("game-active");
    return () => document.body.classList.remove("game-active");
  }, []);

  // Once playing: remember it (so back-nav resumes) and prefetch the reachable
  // routes so rack/checkout/NPC handoffs are instant.
  useEffect(() => {
    if (!started) return;
    gameSession.playing = true;
    GAME_ROUTES.forEach((r) => router.prefetch(r));
  }, [started, router]);

  // Desktop start gate: Z begins play (Phaser owns keys after).
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (keyToBtn(e) === "A") setStarted(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  // Desktop keys while a Yes/No dialogue is open (Phaser ignores keys via the
  // "dialog" flag, so these don't also move Scribbs).
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => {
      const b = keyToBtn(e);
      if (inMessagePhase) {
        // Speech: A / B advance pages; Escape too (mirrors B). Arrows ignored.
        if (b === "A" || b === "B" || e.key === "Escape") {
          e.preventDefault();
          advanceMessage();
        }
        return;
      }
      if (b === "up" || b === "down" || b === "left" || b === "right") {
        e.preventDefault();
        toggleSel();
      } else if (b === "A") {
        e.preventDefault();
        choose(sel);
      } else if (b === "B" || e.key === "Escape") {
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

  // Swap {A}/{B} for the platform's interact/cancel buttons (mobile A/B buttons
  // / desktop Z/X keys).
  const btnify = (s: string) =>
    s.replaceAll("{A}", mobile ? "A" : "Z").replaceAll("{B}", mobile ? "B" : "X");

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
      <GameBoyShell
        layout={layout!}
        screen={screen}
        onPress={handlePress}
        onRelease={handleRelease}
        onInventory={() => router.push("/inventory")}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onOverlayChange={(open) => gameRef.current?.events.emit("overlay", open)}
      />
    </main>
  );
}
