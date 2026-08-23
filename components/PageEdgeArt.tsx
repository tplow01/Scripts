import Image from 'next/image'

interface PageEdgeArtProps {
  left: string
  right: string
  leftAlt: string
  rightAlt: string
  mobile: string
  mobileAlt: string
}

/**
 * Hand-drawn decoration pinned in the wide `lg:px-[200px]` margins reserved by
 * inventory/basement/product pages. Fixed so it stays put while content
 * scrolls. Always behind page content (z-0) — matching the AWGE reference,
 * product photos, titles, prices, and buttons must never be covered by this
 * decoration, on any breakpoint.
 *
 * Below `lg` there's no dedicated margin, so instead of reusing the desktop
 * left/right crops we use a single composed full-viewport image (authored at
 * phone aspect ratio) that bleeds off both edges by design.
 */
export default function PageEdgeArt({ left, right, leftAlt, rightAlt, mobile, mobileAlt }: PageEdgeArtProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 lg:hidden">
        <Image
          src={mobile}
          alt={mobileAlt}
          fill
          sizes="100vw"
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="hidden lg:block">
        <div className="absolute bottom-0 left-0 h-[79.8vh] max-h-[1026px]">
          <Image
            src={left}
            alt={leftAlt}
            width={487}
            height={1400}
            className="h-full w-auto object-contain object-left-bottom"
            priority={false}
          />
        </div>
        <div className="absolute bottom-0 right-0 h-[79.8vh] max-h-[1026px]">
          <Image
            src={right}
            alt={rightAlt}
            width={547}
            height={1400}
            className="h-full w-auto object-contain object-right-bottom"
            priority={false}
          />
        </div>
      </div>
    </div>
  )
}
