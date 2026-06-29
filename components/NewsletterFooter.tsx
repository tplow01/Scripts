'use client'

import { useState } from 'react'
import FooterLinks from '@/components/FooterLinks'

export default function NewsletterFooter() {
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
        <h2 className="text-[28px] font-extrabold leading-none tracking-[0.01em] uppercase mb-[32px]">
          Sign up for updates
        </h2>

        {submitted ? (
          <p className="text-[13px] font-bold tracking-[0.06em] uppercase text-[#0d0d0d]">
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
              className="flex-1 border border-[#0d0d0d] border-r-0 px-[16px] py-[13px] text-[13px] font-bold placeholder:text-[#aaa] placeholder:font-normal bg-white outline-none rounded-l"
            />
            <button
              type="submit"
              className="bg-[#0d0d0d] text-white text-[13px] font-bold tracking-[0.06em] uppercase px-[24px] py-[13px] border border-[#0d0d0d] rounded-r hover:bg-white hover:text-[#0d0d0d] transition-colors duration-150 whitespace-nowrap"
            >
              Sign Up
            </button>
          </form>
        )}
      </div>

      <FooterLinks />
    </>
  )
}
