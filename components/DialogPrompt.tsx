'use client'

import { Press_Start_2P } from 'next/font/google'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const font = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

// FireRed/LeafGreen framing: white fill, navy outer border, pale-blue inner
// rule, faceted (stair-stepped) corners instead of a smooth border-radius —
// real GBA windows are cut from square pixels, never anti-aliased curves.
const ink = '#384058'
const navy = '#1F2A44'
const paleBlue = '#A8C0E0'
const fill = '#F8F8F8'

/** Pixel-cut corner clip-path: `cut` px chopped off each of the 4 corners. */
const stepCorners = (cut: number): React.CSSProperties['clipPath'] =>
  `polygon(0 ${cut}px, ${cut}px ${cut}px, ${cut}px 0, calc(100% - ${cut}px) 0, ` +
  `calc(100% - ${cut}px) ${cut}px, 100% ${cut}px, 100% calc(100% - ${cut}px), ` +
  `calc(100% - ${cut}px) calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, ` +
  `${cut}px 100%, ${cut}px calc(100% - ${cut}px), 0 calc(100% - ${cut}px))`

/** Three nested layers fake a chunky pixel-art window border (no image asset needed). */
function PixelFrame({
  cut = 6,
  style,
  contentStyle,
  children,
}: {
  cut?: number
  style?: React.CSSProperties
  contentStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ background: navy, clipPath: stepCorners(cut), boxShadow: '2px 2px 0 rgba(0,0,0,0.35)', ...style }}>
      <div style={{ background: paleBlue, clipPath: stepCorners(Math.max(cut - 2, 0)), margin: 3 }}>
        <div style={{ background: fill, clipPath: stepCorners(Math.max(cut - 3, 0)), margin: 2, ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Blocky (non-anti-aliased) down-chevron — the classic GBA "more text" cue. */
function PixelArrowDown({ size = 8, color = ink }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="0" y="0" width="7" height="1" fill={color} />
      <rect x="1" y="1" width="5" height="1" fill={color} />
      <rect x="2" y="2" width="3" height="1" fill={color} />
      <rect x="3" y="3" width="1" height="1" fill={color} />
    </svg>
  )
}

/** Blocky right-pointing selector triangle for the YES/NO menu. */
function PixelArrowRight({ size = 8, color = ink }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="0" y="0" width="1" height="7" fill={color} />
      <rect x="1" y="1" width="1" height="5" fill={color} />
      <rect x="2" y="2" width="1" height="3" fill={color} />
      <rect x="3" y="3" width="1" height="1" fill={color} />
    </svg>
  )
}

const TYPE_MS = 22 // ms per revealed character

export interface DialogPromptHandle {
  /** If mid-typewriter, snap to full text and report true (caller should stop
   * there — one press reveals, the next advances). False if nothing to skip. */
  skipTyping: () => boolean
}

/**
 * In-world FireRed dialogue overlay. Two variants:
 *  - `choice`  → text box + YES/NO menu, popped into its top-right corner
 *  - `message` → text box only + blinking ▼ advance arrow (NPC speech, welcome)
 * Text reveals letter-by-letter, GBA-style. Presentational: the page owns
 * selection / advancing; clicking (or `skipTyping` via keyboard) drives it.
 */
const DialogPrompt = forwardRef<DialogPromptHandle, {
  text: string
  variant?: 'choice' | 'message'
  /** Name tab above the box (e.g. "HEATH"); omitted for anonymous/system prompts. */
  speaker?: string
  sel?: 'yes' | 'no'
  onChoose?: (choice: 'yes' | 'no') => void
  onAdvance?: () => void
}>(function DialogPrompt({ text, variant = 'choice', speaker, sel = 'yes', onChoose, onAdvance }, ref) {
  const [typed, setTyped] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTyped(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTyped((n) => {
        if (n >= text.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  useImperativeHandle(ref, () => ({
    skipTyping: () => {
      if (typed < text.length) {
        setTyped(text.length);
        if (timerRef.current) clearInterval(timerRef.current);
        return true;
      }
      return false;
    },
  }), [typed, text.length]);

  const done = typed >= text.length;

  const advanceOrSkip = () => {
    if (!done) {
      setTyped(text.length);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    onAdvance?.();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes scr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* Dialogue text box (speaker tab + YES/NO menu nest inside its corners) */}
      <div
        onClick={variant === 'message' ? advanceOrSkip : undefined}
        style={{
          margin: '0 8px 8px', position: 'relative',
          pointerEvents: variant === 'message' ? 'auto' : 'none',
          cursor: variant === 'message' ? 'pointer' : 'default',
        }}
      >
        {speaker && (
          <div style={{ position: 'absolute', top: -13, left: 10, zIndex: 1 }}>
            <PixelFrame cut={3} contentStyle={{ padding: '2px 8px' }}>
              <span className={font.className} style={{ fontSize: 8, color: ink }}>{speaker.toUpperCase()}</span>
            </PixelFrame>
          </div>
        )}

        <PixelFrame contentStyle={{ padding: '12px 14px', minHeight: 54 }}>
          <span className={font.className} style={{ fontSize: 9, lineHeight: 1.7, color: ink, whiteSpace: 'pre-wrap' }}>
            {text.slice(0, typed)}
          </span>
          {variant === 'message' && done && (
            <span aria-hidden style={{
              position: 'absolute', right: 12, bottom: 8,
              animation: 'scr-blink 0.8s steps(1) infinite',
            }}>
              <PixelArrowDown />
            </span>
          )}
        </PixelFrame>

        {/* YES / NO menu — nested into the box's top-right corner, FireRed-style */}
        {variant === 'choice' && (
          <div style={{ position: 'absolute', top: -34, right: 6, zIndex: 2 }}>
            <PixelFrame cut={4} contentStyle={{ padding: '6px 12px 6px 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(['yes', 'no'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onChoose?.(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      pointerEvents: 'auto',
                    }}
                  >
                    <span style={{ width: 8, display: 'flex', visibility: sel === opt ? 'visible' : 'hidden' }}>
                      <PixelArrowRight />
                    </span>
                    <span className={font.className} style={{ fontSize: 11, color: ink }}>{opt.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </PixelFrame>
          </div>
        )}
      </div>
    </div>
  )
})

export default DialogPrompt
