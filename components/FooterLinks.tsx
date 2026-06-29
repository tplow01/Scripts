import Link from 'next/link'

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

export default function FooterLinks() {
  return (
    <footer className="px-4 md:px-16 lg:px-[200px] pt-[40px] pb-[48px]">

      {/* Socials */}
      <div className="flex flex-wrap justify-center gap-x-[32px] gap-y-[12px] mb-[20px]">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target={s.href.startsWith('http') ? '_blank' : undefined}
            rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0d0d0d] hover:opacity-40 transition-opacity duration-150"
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* Legal */}
      <div className="flex flex-wrap justify-center gap-x-[24px] gap-y-[10px] mb-[20px]">
        {LEGAL.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0d0d0d] hover:opacity-40 transition-opacity duration-150"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <p className="text-center text-[11px] font-bold tracking-[0.06em] uppercase text-[#0d0d0d]">
        © {new Date().getFullYear()} SCR!PTS
      </p>

    </footer>
  )
}
