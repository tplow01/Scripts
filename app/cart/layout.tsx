import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Bag — SCR!PTS',
  robots: { index: false, follow: false },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
