'use client'

import Link from 'next/link'
import { useState } from 'react'

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'YouTube',   href: 'https://youtube.com' },
  { label: 'Email',     href: 'mailto:hello@scripts.com' },
  { label: 'TikTok',    href: 'https://tiktok.com' },
]

const LEGAL = [
  { label: 'Terms of Use',         href: '/terms' },
  { label: 'Delivery Information', href: '/delivery' },
  { label: 'Privacy Policy',       href: '/privacy' },
  { label: 'Purchasing Policy',    href: '/purchasing' },
]

export default function BasementFooter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <>
      {/* Newsletter */}
      <div className="flex flex-col items-center pt-[48px] pb-[40px] px-4 md:px-16 lg:px-[200px]">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#888] mb-[8px]">
          Stay in the loop
        </p>
        <h2 className="text-[28px] font-extrabold leading-none tracking-[0.01em] uppercase mb-[32px] text-[#f7f7f5]">
          Sign up for updates
        </h2>

        {submitted ? (
          <p className="text-[13px] font-bold tracking-[0.06em] uppercase text-[#f7f7f5]">
            You&apos;re in. ✓
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full md:max-w-[480px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 border border-[#f7f7f5] border-r-0 px-[16px] py-[13px] text-[13px] font-bold text-[#f7f7f5] placeholder:text-[#555] placeholder:font-normal bg-transparent outline-none rounded-l"
            />
            <button
              type="submit"
              className="bg-[#f7f7f5] text-[#0d0d0d] text-[13px] font-bold tracking-[0.06em] uppercase px-[24px] py-[13px] border border-[#f7f7f5] rounded-r hover:bg-transparent hover:text-[#f7f7f5] transition-colors duration-150 whitespace-nowrap"
            >
              Sign Up
            </button>
          </form>
        )}
      </div>

      {/* Footer links */}
      <footer className="px-4 md:px-16 lg:px-[200px] pt-[40px] pb-[48px]">

        <div className="flex flex-wrap justify-center gap-x-[32px] gap-y-[12px] mb-[20px]">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith('http') ? '_blank' : undefined}
              rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#f7f7f5] hover:opacity-40 transition-opacity duration-150"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-x-[24px] gap-y-[10px] mb-[20px]">
          {LEGAL.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#f7f7f5] hover:opacity-40 transition-opacity duration-150"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <p className="text-center text-[11px] font-bold tracking-[0.06em] uppercase text-[#f7f7f5]">
          © {new Date().getFullYear()} SCR!PTS
        </p>

      </footer>
    </>
  )
}
