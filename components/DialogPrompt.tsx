'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { pixelOperator } from '@/app/fonts'
import { nextDelay } from '@/lib/dialogTiming'

// SCR!PTS brand tokens (BRAND.md). The window keeps the Pokémon shape — bottom
// bar, faceted pixel corners, name chip, typewriter — but is skinned in these,
// not the FireRed navy/pale-blue it used to lift.
const INK = '#0D0D0D'
const PINK = '#FF8AC7'
const PINK_DEEP = '#FF4FA3'
const PAPER = '#F7F7F5'
const GREY = '#6F6F73'

/** Pixel-cut corner clip-path: `cut` px chopped off each of the 4 corners. */
const stepCorners = (cut: number): React.CSSProperties['clipPath'] =>
  `polygon(0 ${cut}px, ${cut}px ${cut}px, ${cut}px 0, calc(100% - ${cut}px) 0, ` +
  `calc(100% - ${cut}px) ${cut}px, 100% ${cut}px, 100% calc(100% - ${cut}px), ` +
  `calc(100% - ${cut}px) calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, ` +
  `${cut}px 100%, ${cut}px calc(100% - ${cut}px), 0 calc(100% - ${cut}px))`

/** Three nested layers fake a chunky pixel-art window border: ink → pink rule → paper. */
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
    <div style={{ background: INK, clipPath: stepCorners(cut), boxShadow: '2px 2px 0 rgba(0,0,0,0.35)', ...style }}>
      <div style={{ background: PINK, clipPath: stepCorners(Math.max(cut - 2, 0)), margin: 3 }}>
        <div style={{ background: PAPER, clipPath: stepCorners(Math.max(cut - 3, 0)), margin: 2, ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** A chip riding the top edge of the window — used for the name tab and the YES/NO box. */
function Chip({
  offset,
  contentStyle,
  children,
}: {
  offset: React.CSSProperties
  contentStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', zIndex: 3, ...offset }}>
      <PixelFrame cut={3} contentStyle={contentStyle}>{children}</PixelFrame>
    </div>
  )
}

/** Blocky (non-anti-aliased) down-chevron — the classic GBA "more text" cue. */
function PixelArrowDown({ size = 8, color = INK }: { size?: number; color?: string }) {
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
function PixelArrowRight({ size = 8, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="0" y="0" width="1" height="7" fill={color} />
      <rect x="1" y="1" width="1" height="5" fill={color} />
      <rect x="2" y="2" width="1" height="3" fill={color} />
      <rect x="3" y="3" width="1" height="1" fill={color} />
    </svg>
  )
}

/**
 * Two size presets. Pixel Operator is a compact pixel *text* face (far denser
 * than Press Start 2P), so the window can run larger type and still fit: the
 * phone LCD reads at ~15px, the desktop LCD at ~19px.
 */
const SIZES = {
  mobile: {
    margin: '0 8px 8px', boxPad: '11px 14px', boxMinH: 50,
    bodyFont: 15, bodyLine: 1.4,
    chipFont: 11, chipPad: '2px 9px', chipOverlap: 8,
    menuRight: 8, menuPad: '6px 14px 6px 8px', menuGap: 4, menuFont: 15,
    arrow: 9, blinkRight: 12, blinkBottom: 8,
  },
  desktop: {
    margin: '0 14px 14px', boxPad: '15px 20px', boxMinH: 64,
    bodyFont: 19, bodyLine: 1.4,
    chipFont: 14, chipPad: '3px 12px', chipOverlap: 9,
    menuRight: 10, menuPad: '7px 18px 7px 10px', menuGap: 6, menuFont: 18,
    arrow: 11, blinkRight: 14, blinkBottom: 9,
  },
} as const

export interface DialogPromptHandle {
  /** If mid-typewriter, snap to full text and report true (caller should stop
   * there — one press reveals, the next advances). False if nothing to skip. */
  skipTyping: () => boolean
}

/**
 * In-world dialogue overlay, SCR!PTS-skinned. Two variants:
 *  - `choice`  → text box + YES/NO chip on the top-right edge
 *  - `message` → text box only + blinking ▼ advance arrow
 * Text reveals letter-by-letter; while `heldRef.current` is true it skims. The
 * page owns selection / advancing; clicking (or `skipTyping` via keyboard) drives it.
 */
const DialogPrompt = forwardRef<DialogPromptHandle, {
  text: string
  variant?: 'choice' | 'message'
  /** Name chip above the box (e.g. "HEATH"); omitted for anonymous/system prompts. */
  speaker?: string
  /** Phone LCD keeps the compact sizing; desktop LCD scales the window up. */
  mobile?: boolean
  /** Live "confirm button held" flag — fast-forwards the typewriter. */
  heldRef?: React.RefObject<boolean>
  sel?: 'yes' | 'no'
  onChoose?: (choice: 'yes' | 'no') => void
  onAdvance?: () => void
}>(function DialogPrompt({ text, variant = 'choice', speaker, mobile = true, heldRef, sel = 'yes', onChoose, onAdvance }, ref) {
  const s = mobile ? SIZES.mobile : SIZES.desktop
  const [typed, setTyped] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTyped(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    let n = 0
    const step = () => {
      if (n >= text.length) return
      n += 1
      setTyped(n)
      if (n < text.length) {
        const d = nextDelay(text[n - 1] ?? '', text[n] ?? '', heldRef?.current ?? false)
        timerRef.current = setTimeout(step, d)
      }
    }
    timerRef.current = setTimeout(step, nextDelay('', text[0] ?? '', heldRef?.current ?? false))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, heldRef])

  useImperativeHandle(ref, () => ({
    skipTyping: () => {
      if (typed < text.length) {
        setTyped(text.length)
        if (timerRef.current) clearTimeout(timerRef.current)
        return true
      }
      return false
    },
  }), [typed, text.length])

  const done = typed >= text.length

  const advanceOrSkip = () => {
    if (!done) {
      setTyped(text.length)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    onAdvance?.()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes scr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* Dialogue text box (name + YES/NO chips ride its top edge) */}
      <div
        onClick={variant === 'message' ? advanceOrSkip : undefined}
        style={{
          margin: s.margin, position: 'relative',
          pointerEvents: variant === 'message' ? 'auto' : 'none',
          cursor: variant === 'message' ? 'pointer' : 'default',
        }}
      >
        {speaker && (
          <Chip offset={{ left: 10, marginBottom: -s.chipOverlap }} contentStyle={{ padding: s.chipPad }}>
            <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.chipFont, color: INK, letterSpacing: '0.05em' }}>
              {speaker.toUpperCase()}
            </span>
          </Chip>
        )}

        <PixelFrame contentStyle={{ padding: s.boxPad, minHeight: s.boxMinH }}>
          <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.bodyFont, lineHeight: s.bodyLine, color: INK, whiteSpace: 'pre-wrap' }}>
            {text.slice(0, typed)}
          </span>
          {variant === 'message' && done && (
            <span aria-hidden style={{
              position: 'absolute', right: s.blinkRight, bottom: s.blinkBottom,
              animation: 'scr-blink 0.8s steps(1) infinite',
            }}>
              <PixelArrowDown size={s.arrow} color={PINK_DEEP} />
            </span>
          )}
        </PixelFrame>

        {/* YES / NO — its own chip on the top-right edge, same recipe as the name chip */}
        {variant === 'choice' && (
          <Chip offset={{ right: s.menuRight, marginBottom: -s.chipOverlap }} contentStyle={{ padding: s.menuPad }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: s.menuGap }}>
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
                  <span style={{ width: s.arrow, display: 'flex', visibility: sel === opt ? 'visible' : 'hidden' }}>
                    <PixelArrowRight size={s.arrow} color={PINK_DEEP} />
                  </span>
                  <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.menuFont, color: sel === opt ? INK : GREY }}>
                    {opt.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </Chip>
        )}
      </div>
    </div>
  )
})

export default DialogPrompt
