'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { adminPath } from '@/lib/admin/config'

/**
 * Back-office sign-in. The password is posted to /api/admin/session, which
 * exchanges it with Supabase Auth server-side and sets an httpOnly cookie —
 * the token never touches client JavaScript.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        setError(body?.error?.message ?? 'Could not sign in.')
        return
      }
      router.replace(adminPath())
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-[340px]">
        <h1
          className="text-[32px] uppercase tracking-[0.04em] mb-6"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          Back Office
        </h1>

        <label className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 bg-[#101010] border border-grey/30 px-3 py-2 text-[14px] focus:border-pink focus:outline-none"
          required
        />

        <label className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-5 bg-[#101010] border border-grey/30 px-3 py-2 text-[14px] focus:border-pink focus:outline-none"
          required
        />

        {error && (
          <p role="alert" className="mb-4 text-[13px] text-[#FF5C5C]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-pinkDeep text-ink py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
