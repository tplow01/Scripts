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
import { music } from "@/lib/music";
import { gameSession } from "@/lib/gameSession";
import { useShellLayout } from "@/lib/useShellLayout";
import { track } from "@/lib/analytics";
import { HEATH_INTRO_PAGES, PROMPTS, materialize, type ActivePrompt } from "@/lib/gameDialogue";

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
  const { openCart, isOpen: cartIsOpen, count: cartCount } = useCart();
  // Coming back from the shop (gameSession.playing) resumes straight into the
  // game instead of flashing the start screen. Safe for SSR: nothing reads
  // `started` before the layout is known (see the mobile === null guard).
  const [started, setStarted] = useState(() => gameSession.playing);
  // Returning from the shop (as opposed to a fresh visit): cover the game with
  // its own last frame while it re-boots, not the start/loading screen.
  const [resuming] = useState(() => gameSession.playing);
  // True once Phaser has painted its first world frame. Until then the start
  // screen stays up (as "LOADING") so there is never a bare black wait.
  const [worldReady, setWorldReady] = useState(false);
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null);
  const [sel, setSel] = useState<"yes" | "no">("yes");
  const [speakerPos, setSpeakerPos] = useState<{ xFrac: number; yFrac: number } | null>(null);
  const [page, setPage] = useState(0); // current page of an open message prompt
  const [muted, setMuted] = useState(false);

  // Music: browsers need a gesture before audio can start, so arm on the first
  // press; pause when leaving the game world for the shop pages.
  useEffect(() => {
    const arm = () => music.start();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      music.stop();
    };
  }, []);
  useEffect(() => {
    music.setMuted(muted);
  }, [muted]);

  // Set once the Phaser game exists; forwards on-screen buttons into the scene
  // with press/release semantics so a held D-pad arm keeps Scribbs walking.
  const pressRef = useRef<(code: string, down: boolean) => void>(() => {});
  const gameRef = useRef<Phaser.Game | null>(null);
  // The open dialogue box's typewriter — a press first snaps mid-typed text to
  // full, then the NEXT press actually advances (classic GBA text-box feel).
  const dialogRef = useRef<DialogPromptHandle>(null);
  // True while the confirm button (A / Z) is held during a speech prompt — read
  // live by DialogPrompt's typewriter to fast-forward. A ref, not state, so
  // every keydown/up doesn't re-render the game.
  const confirmHeldRef = useRef(false);
  // Latest interaction handler (the game subscribes once, but this closure
  // needs current router/cart/state each render).
  const interactionRef = useRef<(hit: { id: string; type: string }) => void>(() => {});
  interactionRef.current = (hit) => {
    setSpeakerPos(null);
    if (hit.type === "npc") track('npc_interaction');
    if (hit.id === "karl") track('karl_interaction');
    // The vinyl deck is the secret switch: first play reveals the hidden
    // basement entrance; afterwards it's just an idle line.
    if (hit.id === "vinyl") {
      track('vinyl_interaction');
      music.setTrack(music.track === "grime" ? "lofi" : "grime");
      const revealed = gameSession.revealed.has("basement-entrance");
      if (!revealed) track('basement_discovered');
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
        setPrompt(materialize({ variant: "message", pages: [music.track === "grime" ? "You drop the needle on something harder." : "You flip back to the mellow side."] }));
      }
      gameRef.current?.events.emit("dialog", true);
      return;
    }
    let p = PROMPTS[hit.id] ?? PROMPTS[hit.type];
    if (!p) return;
    // The till knows what's in the bag: an empty one gets a nudge instead of
    // an empty drawer; a full one rings up.
    if (p.variant !== "message" && p.kind === "cart") {
      p =
        cartCount === 0
          ? { variant: "message", speaker: "Heath", pages: ["Your bag's empty. Grab something off the racks first."] }
          : { variant: "choice", speaker: "Heath", question: `${cartCount} ${cartCount === 1 ? "piece" : "pieces"} in your bag. Checkout?`, kind: "cart" };
    }
    setSel("yes");
    setPage(0);
    setPrompt(materialize(p));
    gameRef.current?.events.emit("dialog", true);
  };

  // Heath's greeting — fired once by the scene when he reaches the player.
  const welcomeRef = useRef<() => void>(() => {});
  welcomeRef.current = () => {
    // Leave speakerPos alone — the scene emits "speaker" for Heath's head just
    // before "welcome", so the intro bubble gets the same tail as every NPC.
    setPage(0);
    setPrompt(materialize({ variant: "message", pages: HEATH_INTRO_PAGES, speaker: "Heath" }));
    gameRef.current?.events.emit("dialog", true);
  };

  const onGame = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    pressRef.current = (code: string, down: boolean) => game.events.emit("vbutton", code, down);
    game.events.on("interaction", (hit: { id: string; type: string }) => interactionRef.current(hit));
    game.events.on("welcome", () => welcomeRef.current());
    game.events.once("world-ready", () => setWorldReady(true));
    game.events.on("speaker", (p: { xFrac: number; yFrac: number } | null) => setSpeakerPos(p));
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
    confirmHeldRef.current = false;
    setSpeakerPos(null);
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

  // Leave the game for a shop page. Movement is frozen the moment the player
  // says yes (no walking around while the next page loads), and the last drawn
  // frame is kept so coming back can show it instead of a loading screen.
  const leaveTo = useCallback(
    (path: string) => {
      const game = gameRef.current;
      if (!game) {
        router.push(path);
        return;
      }
      game.events.emit("overlay", true);
      let gone = false;
      const go = () => {
        if (gone) return;
        gone = true;
        router.push(path);
      };
      // The canvas can only be read reliably right after a draw, so capture
      // inside the next post-render, then navigate. The timer is a safety net.
      game.events.once("postrender", () => {
        try {
          gameSession.snapshot = game.canvas.toDataURL("image/jpeg", 0.85);
        } catch {
          gameSession.snapshot = null;
        }
        go();
      });
      setTimeout(go, 250);
    },
    [router],
  );

  const choose = useCallback(
    (choice: "yes" | "no") => {
      const kind = prompt && prompt.variant !== "message" ? prompt.kind : undefined;
      closePrompt();
      if (choice === "no" || !kind) return;
      if (kind === "inventory") leaveTo("/inventory");
      else if (kind === "basement") leaveTo("/basement");
      else if (kind === "cart") openCart();
    },
    [prompt, closePrompt, leaveTo, openCart],
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
          if (b === "A") confirmHeldRef.current = true;
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
      if (b === "A") confirmHeldRef.current = false;
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

    // Holding a control on a phone must never raise the OS long-press UI (the
    // text magnifier, the "save image" callout, the context menu). CSS covers
    // most of it; these two listeners cover the rest: a non-passive touchstart
    // on the hold controls (D-pad, A/B), and the context menu everywhere in the
    // game. Scoped to [data-hold] so ordinary buttons keep their click.
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-hold]")) e.preventDefault();
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.body.classList.remove("game-active");
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // Warm everything the game needs while the player is still on the start
  // screen: the reachable routes (so rack/checkout/NPC handoffs are instant),
  // the Phaser bundle, and the world's images. Clicking start then only has
  // to boot, not download.
  useEffect(() => {
    GAME_ROUTES.forEach((r) => router.prefetch(r));
    void import("phaser");
    void import("@/game/config");
    let cancelled = false;
    void import("@/game/bootImages").then(({ bootImages }) => {
      if (cancelled) return;
      for (const { url } of bootImages()) void fetch(url).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Never trap the player behind the cover: if the first frame somehow never
  // reports in, lift it anyway after a few seconds.
  useEffect(() => {
    if (!started || worldReady) return;
    const id = setTimeout(() => setWorldReady(true), 8000);
    return () => clearTimeout(id);
  }, [started, worldReady]);

  // Once playing: remember it so back-nav resumes.
  useEffect(() => {
    if (!started) return;
    gameSession.playing = true;
  }, [started]);

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
          if (b === "A") confirmHeldRef.current = true;
          if (e.repeat) return; // held key: fast-forward the typewriter only, don't auto-advance pages
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
    const onKeyUp = (e: KeyboardEvent) => {
      if (keyToBtn(e) === "A") confirmHeldRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      confirmHeldRef.current = false;
    };
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

  // One StartScreen instance for the whole boot: "CLICK TO START" before the
  // click, then the same scene as "LOADING..." over the canvas while it boots,
  // lifting only once the first world frame has painted. Keeping it mounted
  // means the intro animation never restarts and there is no black gap.
  const screen = (
    <>
      {started && <PhaserGame onGame={onGame} />}
      {started && prompt &&
        (prompt.variant === "choice" ||
        (prompt.variant === "messageChoice" && page >= prompt.pages.length) ? (
          <DialogPrompt
            ref={dialogRef}
            variant="choice"
            text={btnify(prompt.question)}
            mobile={mobile}
            heldRef={confirmHeldRef}
            speakerPos={speakerPos}
            speaker={prompt.speaker}
            sel={sel}
            onChoose={choose}
          />
        ) : (
          <DialogPrompt
            ref={dialogRef}
            variant="message"
            text={btnify(prompt.pages[page])}
            mobile={mobile}
            heldRef={confirmHeldRef}
            speakerPos={speakerPos}
            speaker={prompt.speaker}
            onAdvance={advanceMessage}
          />
        ))}
      {!(started && worldReady) &&
        (resuming ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gameSession.snapshot ?? undefined}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              zIndex: 20, background: "#16161A", pointerEvents: "none",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <StartScreen mobile={mobile} loading={started} onStart={() => { track('click_to_start'); setStarted(true); }} />
        ))}
    </>
  );

  return (
    <main className="h-dvh w-screen overflow-hidden">
      <GameBoyShell
        layout={layout!}
        screen={screen}
        onPress={handlePress}
        onRelease={handleRelease}
        onInventory={() => {
          if (!started) track('inventory_shortcut');
          leaveTo("/inventory");
        }}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onOverlayChange={(open) => gameRef.current?.events.emit("overlay", open)}
      />
    </main>
  );
}
