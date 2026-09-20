import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Confirmation — SCR!PTS',
  robots: { index: false, follow: false },
}

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
