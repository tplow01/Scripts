import { CYBER_LOVE_PRODUCTS } from "@/lib/products";

/**
 * In-world dialogue content — pure data, no React or Phaser here. Kept apart
 * from app/page.tsx (the state machine that drives it) the same way product
 * copy lives in lib/products.ts rather than the cart logic that reads it.
 */

// In-world fixtures that open a Yes/No prompt, and what "Yes" does. Keyed by
// interaction id first, then type — so the basement NPC routes differently from
// the lobby cashier even though both are "npc".
export type PromptKind = "inventory" | "cart" | "basement";

// A prompt is a Yes/No navigation choice, a multi-page NPC message, or speech
// pages that END in a Yes/No choice (the basement NPC's secretive pitch).
// `speaker` names the nameplate tab above the box — omitted for system prompts
// (rack/checkout) and anonymous floor shoppers, who stay untagged.
export type PromptPage = string | (() => string);

export type PromptDef =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: PromptPage[]; speaker?: string }
  | { variant: "messageChoice"; pages: PromptPage[]; question: string; kind: PromptKind; speaker?: string };

// Open prompt state (paged prompts also track the current page via `page`;
// a messageChoice at page === pages.length is in its choice phase). Unlike
// PromptDef, an ActivePrompt's pages are always plain strings — any
// function-valued page (e.g. npc-checkout's random product line) is resolved
// ONCE, when the prompt opens, so an unrelated re-render (tapping MUTE while
// reading) can't re-roll it or restart the typewriter.
export type ActivePrompt =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: string[]; speaker?: string }
  | { variant: "messageChoice"; pages: string[]; question: string; kind: PromptKind; speaker?: string };

// Resolve a page's text — plain string, or a function evaluated once here.
const pageText = (p: PromptPage) => (typeof p === "function" ? p() : p);

// Materialize a PromptDef into an ActivePrompt, resolving any function pages
// at open time rather than at render time.
export const materialize = (p: PromptDef): ActivePrompt =>
  p.variant === "choice" ? p : { ...p, pages: p.pages.map(pageText) };

export const PROMPTS: Record<string, PromptDef> = {
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
  // Clicking the counter with the mouse — straight to the Yes/No, no walk-over
  // and no cashier small talk (see WorldScene.onPointerDown).
  cart: { variant: "choice", question: "Open cart?", kind: "cart" },
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
};

// Heath's greeting on genuine first entry — he walks over from the counter to
// deliver it. {A} becomes the platform's interact button (A on mobile, Z on web).
export const HEATH_INTRO_PAGES = [
  "… Yooo. My name is Heath. I'm the founder of SCR!PTS. Welcome to our world!",
  "Walk up to anything and press {A} to check it out, or just click it with your mouse.",
  "When you're ready, click the counter to open your cart and check out.",
];
