'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart'

const ICON_CLS = 'flex items-center justify-center w-[36px] h-[36px] hover:opacity-60 transition-opacity'

export default function BasementNavBar({ backHref = '/basement' }: { backHref?: string }) {
  const { count, openCart } = useCart()

  return (
    <header className="relative flex items-center px-4 md:px-16 lg:px-[200px] pt-6 md:pt-10 lg:pt-[64px] pb-4 md:pb-8 lg:pb-[48px]">

      {/* Left — back arrow */}
      <Link href={backHref} aria-label="Back" className={ICON_CLS}>
        <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
          <path d="M23.8406 12.4604C23.8402 11.4627 22.669 10.9255 21.9128 11.5766L4.89429 26.2319C3.81325 27.1628 3.81325 28.8372 4.89429 29.7681L21.9128 44.4233C22.669 45.0744 23.8402 44.5372 23.8406 43.5395V35.5835H47.1746C48.4631 35.5833 49.5076 34.5381 49.5076 33.2495V22.7495C49.5073 21.4612 48.4629 20.4167 47.1746 20.4165H23.8406V12.4604Z" stroke="#f7f7f5" strokeWidth="4.5"/>
        </svg>
      </Link>

      {/* Center — absolutely positioned so it's always page-center */}
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
        <span
          className="text-[28px] md:text-[40px] lg:text-[52px] leading-none tracking-[0.06em] text-[#f7f7f5] uppercase whitespace-nowrap pointer-events-auto"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          THE BASEMENT
        </span>
      </div>

      {/* Right — account + bag */}
      <div className="flex items-center gap-[16px] ml-auto">
        <Link href="/account" aria-label="Account" className={ICON_CLS}>
          <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
            <path d="M8.75 47.25V43.75C8.75 38.5953 12.9287 34.4167 18.0833 34.4167H37.9167C43.0713 34.4167 47.25 38.5953 47.25 43.75V47.25M39.0833 17.5C39.0833 23.6212 34.1212 28.5833 28 28.5833C21.8788 28.5833 16.9167 23.6212 16.9167 17.5C16.9167 11.3788 21.8788 6.41667 28 6.41667C34.1212 6.41667 39.0833 11.3788 39.0833 17.5Z" stroke="#f7f7f5" strokeWidth="4.5" strokeLinecap="square"/>
          </svg>
        </Link>

        <button onClick={openCart} aria-label="Bag" className={`${ICON_CLS} relative`}>
          <span className="flex items-center justify-center w-[26px] h-[26px]">
            {count > 0 ? (
              <svg width="16" height="15" viewBox="0 0 34 31" fill="none">
                <path d="M26.4361 10.0838H30.2879C31.3225 10.0838 32.1072 11.0167 31.9299 12.036L31.4003 15.0812M26.4361 10.0838H7.26939M26.4361 10.0838L23.1027 1.75046M7.26939 10.0838H3.4176C2.38294 10.0838 1.5983 11.0167 1.77558 12.036L4.28901 26.4883C4.56669 28.0849 5.95246 29.2505 7.57305 29.2505H13.9361M7.26939 10.0838L10.6027 1.75046" stroke="#f7f7f5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
                <path d="M41.4169 20.4167H46.8093C48.2578 20.4167 49.3563 21.7227 49.1082 23.1498L48.3668 27.4132M41.4169 20.4167H14.5836M41.4169 20.4167L36.7502 8.75M14.5836 20.4167H9.19097C7.74243 20.4167 6.64393 21.7227 6.89215 23.1498L10.4144 43.3829C10.7997 45.5516 12.7064 47.25 14.9419 47.25H23.9169M14.5836 20.4167L19.2503 8.75M32.0836 42H39.6669M39.6669 42H47.2503M39.6669 42V34.4167M39.6669 42V49.5833" stroke="#f7f7f5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          {count > 0 && (
            <span
              className="absolute w-[16px] h-[16px] rounded-full bg-[#f7f7f5] text-[#0d0d0d] text-[9px] font-bold flex items-center justify-center leading-none"
              style={{ bottom: '-2px', right: '-6px' }}
            >
              {count}
            </span>
          )}
        </button>
      </div>

    </header>
  )
}
