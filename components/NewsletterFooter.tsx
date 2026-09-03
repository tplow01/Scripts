'use client'

import { useState } from 'react'
import FooterLinks from '@/components/FooterLinks'

export default function NewsletterFooter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        setError(body?.error?.message ?? 'That did not go through. Try again.')
        return
      }
      setSubmitted(true)
      setEmail('')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
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
              disabled={busy}
              className="bg-white text-[#0d0d0d] text-[13px] font-bold tracking-[0.06em] uppercase px-[24px] py-[13px] border border-[#0d0d0d] rounded-r hover:bg-[#0d0d0d] hover:text-white transition-colors duration-150 whitespace-nowrap disabled:opacity-50"
            >
              {busy ? 'Signing up…' : 'Sign Up'}
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-[12px] text-[12px] font-bold tracking-[0.04em] text-[#c0392b]">
            {error}
          </p>
        )}
      </div>

      <FooterLinks />
    </>
  )
}
