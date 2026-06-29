'use client'

import { Press_Start_2P } from 'next/font/google'
import { useEffect, useState } from 'react'

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

const BODY = `linear-gradient(160deg, #D4D4C8 0%, #BCBCB0 25%, #A8A89C 55%, #989890 75%, #8C8C84 100%)`

function ScreenContent({ blink, mobile = false }: { blink: boolean; mobile?: boolean }) {
  return (
    <>
      {/* Scanlines ~5% */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)',
      }} />

      {/* Dot matrix */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }} />

      {/* Corner vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.18) 100%)',
      }} />

      {/* Screen inset shadow — LCD recessed into bezel */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.28), inset 4px 0 8px rgba(0,0,0,0.12), inset -4px 0 8px rgba(0,0,0,0.12), inset 0 -2px 6px rgba(0,0,0,0.1)',
        borderRadius: 4,
      }} />

      {/* Screen glow — soft bloom radiating from edges */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        boxShadow: 'inset 0 0 40px rgba(220,220,210,0.4)',
        borderRadius: 4,
      }} />

      {/* Text layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 6,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: mobile ? '0 16px' : '0 24px',
      }}>
        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(26px, 9vw, 44px)' : 'clamp(32px, 5.5vw, 80px)',
            color: '#0D0D0D',
            letterSpacing: '0.05em',
            lineHeight: 1,
            marginBottom: '0.45em',
            filter: 'drop-shadow(2px 3px 0px rgba(0,0,0,0.25))',
          }}
        >
          SCR!PTS
        </div>

        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(5px, 1.8vw, 8px)' : 'clamp(6px, 0.65vw, 10px)',
            color: '#666',
            letterSpacing: '0.14em',
            marginBottom: mobile ? '2em' : '2.2em',
          }}
        >
          Storytelling through clothing
        </div>

        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(7px, 2.2vw, 11px)' : 'clamp(8px, 0.95vw, 14px)',
            color: '#888',
            letterSpacing: '0.2em',
            opacity: blink ? 1 : 0,
            transition: 'opacity 0.08s',
            display: 'flex', alignItems: 'center', gap: '0.5em',
          }}
        >
          <span style={{ color: '#777' }}>›</span>
          PRESS START
        </div>
      </div>

      {/* Copyright — pinned to bottom of screen */}
      <div style={{
        position: 'absolute', bottom: mobile ? 10 : 14, left: 0, right: 0,
        zIndex: 6, textAlign: 'center',
      }}>
        <span
          className={pressStart.className}
          style={{
            fontSize: mobile ? 5 : 7,
            color: '#999',
            letterSpacing: '0.12em',
          }}
        >
          © SCR!PTS 2026
        </span>
      </div>
    </>
  )
}

function ScreenModule({
  blink,
  mobile = false,
  style = {},
}: {
  blink: boolean
  mobile?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',
      position: 'relative',
      ...style,
    }}>
      {/* Screen light bleed — glow from LCD onto the black bezel */}
      <div style={{
        position: 'absolute',
        top: mobile ? 14 : 18,
        left: mobile ? 14 : 18,
        right: mobile ? 14 : 18,
        bottom: mobile ? 30 : 38,
        borderRadius: 4,
        boxShadow: '0 0 24px 4px rgba(220,220,210,0.18)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{
        flex: 1,
        margin: mobile ? '14px 14px 0 14px' : '18px 18px 0 18px',
        background: '#DCDCDA',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        <ScreenContent blink={blink} mobile={mobile} />
      </div>

      <div style={{
        height: mobile ? 30 : 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, zIndex: 1,
      }}>
        <span className={pressStart.className} style={{
          fontSize: mobile ? 6 : 8, color: '#3A3A3A', letterSpacing: 4,
        }}>
          SCR!PTS
        </span>
      </div>
    </div>
  )
}

export default function LoadingPage() {
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 700)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-screen w-screen" style={{ background: BODY }}>

      {/* ── DESKTOP ── */}
      <div className="hidden md:flex items-center justify-center w-full h-full" style={{ position: 'relative' }}>

        {/* Grey raised-surface bevel — top-left bright, bottom-right dark */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.22) 0px, transparent 160px),
            linear-gradient(315deg, rgba(0,0,0,0.18) 0px, transparent 160px)
          `,
        }} />

        <div style={{
          position: 'relative',
          width: 'calc(100vw - 80px)',
          height: 'calc(100vh - 80px)',
          borderRadius: 16,
          overflow: 'hidden',
          /* Device sits recessed — shadow goes outward to blend with grey above it */
          boxShadow: '0 2px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)',
        }}>
          <ScreenModule blink={blink} style={{ width: '100%', height: '100%' }} />

          {/* Strong inset shadow — grey lip casting shadow down onto the black */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
            boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.95), inset 0 -3px 8px rgba(0,0,0,0.6), inset 5px 0 12px rgba(0,0,0,0.6), inset -5px 0 12px rgba(0,0,0,0.6)',
          }} />

          {/* Left + top edge highlight on black */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
            background: `
              linear-gradient(90deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.05) 3px, transparent 10px),
              linear-gradient(180deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.04) 3px, transparent 10px)
            `,
          }} />
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="flex md:hidden w-full h-full" style={{ flexDirection: 'column' }}>

        {/* Top half — screen */}
        <div style={{
          height: '50%',
          background: BODY,
          padding: '16px 16px 0 16px',
          display: 'flex', alignItems: 'stretch',
          position: 'relative',
        }}>
          {/* Left + top edge highlight on screen section */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
              linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
            `,
          }} />
          <ScreenModule blink={blink} mobile style={{
            flex: 1,
            borderRadius: '10px 10px 0 0',
            overflow: 'hidden',
            boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), inset 2px 0 6px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.4)',
          }} />
        </div>

        {/* Bottom half — controls */}
        <div style={{
          height: '50%',
          background: BODY,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '12px 28px 20px 28px',
          position: 'relative',
        }}>
          {/* Left + top edge highlight on controls section */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
              linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
            `,
          }} />

          <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', marginBottom: 0 }} />

          {/* Controls — two rows like a real Game Boy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>

            {/* Row 1: D-pad + A/B */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* D-Pad */}
              <div style={{ position: 'relative', width: 110, height: 110 }}>
                <div style={{
                  position: 'absolute', top: '33%', left: 0, right: 0, height: '34%',
                  background: 'linear-gradient(180deg, #969690 0%, #808080 100%)',
                  borderRadius: 6,
                  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 2px rgba(255,255,255,0.08)',
                }} />
                <div style={{
                  position: 'absolute', left: '33%', top: 0, bottom: 0, width: '34%',
                  background: 'linear-gradient(90deg, #969690 0%, #808080 100%)',
                  borderRadius: 6,
                  boxShadow: 'inset 2px 0 5px rgba(0,0,0,0.55), inset -1px 0 2px rgba(255,255,255,0.08)',
                }} />
                <div style={{
                  position: 'absolute', top: '33%', left: '33%',
                  width: '34%', height: '34%',
                  background: '#7A7A74', borderRadius: 3,
                }} />
              </div>

              {/* A / B */}
              <div style={{ position: 'relative', width: 120, height: 110 }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(145deg, #C0396A 0%, #8B1A42 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 3px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className={pressStart.className} style={{ fontSize: 12, color: '#fff' }}>B</span>
                </div>
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(145deg, #C0396A 0%, #8B1A42 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 3px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className={pressStart.className} style={{ fontSize: 12, color: '#fff' }}>A</span>
                </div>
              </div>
            </div>

            {/* Row 2: speaker grille + SELECT/START centered below */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* Speaker slits */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3, height: 14, borderRadius: 2,
                    background: 'rgba(0,0,0,0.22)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                  }} />
                ))}
              </div>

              {/* SELECT + START pills side by side */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {['SELECT', 'START'].map((label) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 44, height: 13,
                      background: 'linear-gradient(180deg, #969690 0%, #808080 100%)',
                      borderRadius: 7,
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.08)',
                    }} />
                    <span className={pressStart.className} style={{ fontSize: 5, color: '#555', letterSpacing: 0.5 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
