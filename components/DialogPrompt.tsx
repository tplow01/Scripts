'use client'

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { nextDelay } from '@/lib/dialogTiming'

const INK = '#0D0D0D'
const PAPER = '#F7F7F5'
const PINK_DEEP = '#FF4FA3'
const PANEL = '#151515'

/** Fixed-bubble metrics, one set per platform. All values are px unless noted. */
const SIZES = {
  mobile: {
    wFrac: 0.9, maxW: 460, top: 12, radius: 16, padX: 14, padY: 12, minH: 56,
    bodyFont: 15, nameFont: 12, tick: 13,
    tailBase: 26, tailGap: 8,
    panelBottom: 16, panelW: 172, panelFont: 14, panelPadY: 10,
  },
  desktop: {
    wFrac: 0.82, maxW: 720, top: 18, radius: 22, padX: 20, padY: 14, minH: 62,
    bodyFont: 17, nameFont: 13, tick: 14,
    tailBase: 34, tailGap: 10,
    panelBottom: 22, panelW: 190, panelFont: 15, panelPadY: 11,
  },
} as const

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const arc = (r: number, x: number, y: number) => `A ${r} ${r} 0 0 1 ${x} ${y}`

/**
 * Build one SVG path for the rounded bubble body plus, when a speaker point is
 * given and sits below the body, a triangular tail notched into the bottom edge
 * (constant base width, apex just above the speaker). Body + tail are one
 * outline, so the join is seamless.
 */
function bubblePath(
  bx: number, by: number, bw: number, bh: number, r: number,
  tail: { apexX: number; apexY: number; base: number } | null,
): string {
  const right = bx + bw
  const bottom = by + bh
  let d = `M ${bx + r} ${by}`
  d += ` L ${right - r} ${by} ${arc(r, right, by + r)}`
  d += ` L ${right} ${bottom - r} ${arc(r, right - r, bottom)}`
  if (tail && tail.apexY > bottom + 3) {
    const c = clamp(tail.apexX, bx + r + tail.base / 2 + 2, right - r - tail.base / 2 - 2)
    d += ` L ${c + tail.base / 2} ${bottom} L ${tail.apexX} ${tail.apexY} L ${c - tail.base / 2} ${bottom}`
  }
  d += ` L ${bx + r} ${bottom} ${arc(r, bx, bottom - r)}`
  d += ` L ${bx} ${by + r} ${arc(r, bx + r, by)} Z`
  return d
}

export interface DialogPromptHandle {
  /** If mid-typewriter, snap to full text and report true. False if nothing to skip. */
  skipTyping: () => boolean
}

/**
 * In-world speech bubble. A fixed rounded bubble near the top of the LCD; its
 * tail (one seamless shape with the body) leans toward `speakerPos`. `message`
 * variant blinks a pink ▼ and advances on click; `choice` variant shows a
 * detached dark Yes/No panel. Text reveals letter-by-letter (see nextDelay);
 * while `heldRef.current` is true a non-choice line skims.
 */
const DialogPrompt = forwardRef<DialogPromptHandle, {
  text: string
  variant?: 'choice' | 'message'
  speaker?: string
  mobile?: boolean
  heldRef?: React.RefObject<boolean>
  speakerPos?: { xFrac: number; yFrac: number } | null
  sel?: 'yes' | 'no'
  onChoose?: (choice: 'yes' | 'no') => void
  onAdvance?: () => void
}>(function DialogPrompt(
  { text, variant = 'choice', speaker, mobile = true, heldRef, speakerPos = null, sel = 'yes', onChoose, onAdvance },
  ref,
) {
  const S = mobile ? SIZES.mobile : SIZES.desktop
  const held = () => variant !== 'choice' && (heldRef?.current ?? false)

  const [typed, setTyped] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [textH, setTextH] = useState(0)

  // Measure the overlay and the rendered text block.
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (el) setBox({ w: el.clientWidth, h: el.clientHeight })
      if (textRef.current) setTextH(textRef.current.scrollHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (rootRef.current) ro.observe(rootRef.current)
    if (textRef.current) ro.observe(textRef.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  // Re-measure the text height whenever the revealed text changes.
  useLayoutEffect(() => {
    if (textRef.current) setTextH(textRef.current.scrollHeight)
  }, [text, typed, speaker, mobile])

  // Typewriter — self-rescheduling so each gap can differ (nextDelay).
  useEffect(() => {
    setTyped(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    let n = 0
    const step = () => {
      if (n >= text.length) return
      n += 1
      setTyped(n)
      if (n < text.length) {
        timerRef.current = setTimeout(step, nextDelay(text[n - 1] ?? '', text[n] ?? '', held()))
      }
    }
    timerRef.current = setTimeout(step, nextDelay('', text[0] ?? '', held()))
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
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

  // Geometry (px in the overlay's own box).
  const bw = Math.min(S.maxW, box.w * S.wFrac)
  const bx = (box.w - bw) / 2
  const by = S.top
  const bh = Math.max(S.minH, textH + 2 * S.padY)
  const tail = speakerPos
    ? { apexX: speakerPos.xFrac * box.w, apexY: speakerPos.yFrac * box.h - S.tailGap, base: S.tailBase }
    : null
  const ready = box.w > 0

  return (
    <div ref={rootRef} aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      <style>{`@keyframes scr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {ready && (
        <svg
          width={box.w} height={box.h} aria-hidden
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none',
                   filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.30))' }}
        >
          <path d={bubblePath(bx, by, bw, bh, S.radius, tail)} fill={PAPER} />
        </svg>
      )}

      {/* Transparent hit area over the bubble body — click advances a message. */}
      {ready && variant === 'message' && (
        <div
          onClick={advanceOrSkip}
          style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh,
                   pointerEvents: 'auto', cursor: 'pointer' }}
        />
      )}

      {/* Text layer — inherits font-body; measured for the bubble height. */}
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          left: (ready ? bx : 0) + S.padX,
          top: by + S.padY,
          width: (ready ? bw : box.w || 320) - 2 * S.padX,
          color: INK, fontWeight: 700, fontSize: S.bodyFont, lineHeight: 1.4,
          whiteSpace: 'pre-wrap', pointerEvents: 'none',
        }}
      >
        {speaker && (
          <span style={{ display: 'block', fontFamily: 'var(--font-bebas), sans-serif',
                         color: PINK_DEEP, fontSize: S.nameFont, letterSpacing: '0.16em',
                         lineHeight: 1, marginBottom: 5 }}>
            {speaker.toUpperCase()}
          </span>
        )}
        {text.slice(0, typed)}
        {!done && (
          <span style={{ display: 'inline-block', width: S.nameFont, height: S.bodyFont,
                         background: PINK_DEEP, transform: 'translateY(2px)', marginLeft: 1 }} />
        )}
      </div>

      {/* Advance tick (message, fully typed). */}
      {ready && variant === 'message' && done && (
        <span
          aria-hidden
          style={{ position: 'absolute', left: bx + bw - S.padX - S.tick, top: by + bh - S.padY - S.tick - 2,
                   color: PINK_DEEP, fontSize: S.tick, lineHeight: 1,
                   animation: 'scr-blink 0.8s steps(1) infinite' }}
        >
          ▼
        </span>
      )}

      {/* Yes / No — detached dark panel, lower-centre. */}
      {variant === 'choice' && (
        <div style={{
          position: 'absolute', left: '50%', bottom: S.panelBottom, transform: 'translateX(-50%)',
          width: S.panelW, background: PANEL, borderRadius: 13, overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(0,0,0,0.34)', pointerEvents: 'auto',
        }}>
          {(['yes', 'no'] as const).map((opt, i) => (
            <button
              key={opt}
              onClick={() => onChoose?.(opt)}
              style={{
                display: 'block', width: '100%', border: 0, cursor: 'pointer',
                fontWeight: 700, fontSize: S.panelFont, padding: `${S.panelPadY}px 18px`,
                textAlign: 'center',
                background: sel === opt ? PINK_DEEP : 'transparent',
                color: sel === opt ? INK : PAPER,
                borderTop: i === 1 ? '1px solid rgba(255,255,255,0.08)' : undefined,
              }}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default DialogPrompt
