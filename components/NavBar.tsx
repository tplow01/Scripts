'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart'

interface NavBarProps {
  showBack?: boolean
  /** Where the back arrow goes. Defaults to the game Lobby (resumes in place). */
  backHref?: string
  /** Centred page title. Defaults to INVENTORY. */
  title?: string
  /** Where the title links. `null` renders it as plain text. */
  titleHref?: string | null
  /** Render the title as the page's <h1>. Off where the page has its own heading. */
  titleIsH1?: boolean
  /** Show the bag button top-right. Off on the policy pages. */
  showCart?: boolean
}

const ICON_CLS = 'flex items-center justify-center w-[36px] h-[36px] hover:opacity-60 transition-opacity'

export default function NavBar({
  showBack = false,
  backHref = '/',
  title = 'INVENTORY',
  titleHref = '/inventory',
  showCart = true,
  titleIsH1 = false,
}: NavBarProps) {
  const { count, isOpen, openCart } = useCart()

  return (
    <header className={`relative bg-white flex items-center px-4 md:px-16 lg:px-[200px] pt-6 md:pt-10 lg:pt-[64px] pb-4 md:pb-8 lg:pb-[48px]`}>

      {/* Spacer — the buttons below are fixed, so hold the header's height */}
      <div className="h-[36px]" />

      {/* Left — back arrow (fixed: stays put while the title scrolls away) */}
      <Link
        href={backHref}
        aria-label="Back"
        className={`fixed z-50 top-6 md:top-10 lg:top-[64px] left-4 md:left-16 lg:left-[200px] ${ICON_CLS} bg-white rounded-full ${showBack ? '' : 'invisible pointer-events-none'}`}
      >
        <svg width="26" height="26" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.8406 12.4604C23.8402 11.4627 22.669 10.9255 21.9128 11.5766L4.89429 26.2319C3.81325 27.1628 3.81325 28.8372 4.89429 29.7681L21.9128 44.4233C22.669 45.0744 23.8402 44.5372 23.8406 43.5395V35.5835H47.1746C48.4631 35.5833 49.5076 34.5381 49.5076 33.2495V22.7495C49.5073 21.4612 48.4629 20.4167 47.1746 20.4165H23.8406V12.4604Z" fill="#0D0D0D"/>
        </svg>
      </Link>

      {/* Center — absolutely positioned so it's always page-center */}
      {(() => {
        const label = (
          <span
            className="text-[28px] md:text-[40px] lg:text-[52px] leading-none tracking-[0.06em] text-[#0d0d0d] uppercase whitespace-nowrap pointer-events-auto"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {title}
          </span>
        )
        const cls = 'absolute left-0 right-0 flex justify-center pointer-events-none'
        if (!titleHref) return <h1 className={cls}>{label}</h1>
        const link = <Link href={titleHref} className={cls}>{label}</Link>
        return titleIsH1 ? <h1 className="contents">{link}</h1> : link
      })()}

      {/* Right — bag */}
      {showCart && (
        <button onClick={openCart} aria-label="Bag" className={`fixed z-50 top-6 md:top-10 lg:top-[64px] right-4 md:right-16 lg:right-[200px] ${ICON_CLS} bg-white rounded-full`}>
          {/* Fixed 26×26 container keeps layout stable on icon swap */}
          <span className="flex items-center justify-center w-[26px] h-[26px]">
            {count > 0 ? (
              <svg width="16" height="15" viewBox="0 0 34 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26.4361 10.0838H30.2879C31.3225 10.0838 32.1072 11.0167 31.9299 12.036L31.4003 15.0812M26.4361 10.0838H7.26939M26.4361 10.0838L23.1027 1.75046M7.26939 10.0838H3.4176C2.38294 10.0838 1.5983 11.0167 1.77558 12.036L4.28901 26.4883C4.56669 28.0849 5.95246 29.2505 7.57305 29.2505H13.9361M7.26939 10.0838L10.6027 1.75046" stroke="#0D0D0D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M41.4169 20.4167H46.8093C48.2578 20.4167 49.3563 21.7227 49.1082 23.1498L48.3668 27.4132M41.4169 20.4167H14.5836M41.4169 20.4167L36.7502 8.75M14.5836 20.4167H9.19097C7.74243 20.4167 6.64393 21.7227 6.89215 23.1498L10.4144 43.3829C10.7997 45.5516 12.7064 47.25 14.9419 47.25H23.9169M14.5836 20.4167L19.2503 8.75M32.0836 42H39.6669M39.6669 42H47.2503M39.6669 42V34.4167M39.6669 42V49.5833" stroke="#0D0D0D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          {count > 0 && !isOpen && (
            <span
              className="absolute w-[16px] h-[16px] rounded-full bg-[#0d0d0d] text-white text-[9px] font-bold flex items-center justify-center leading-none"
              style={{ bottom: '-2px', right: '-6px' }}
            >
              {count}
            </span>
          )}
        </button>
      )}

    </header>
  )
}
