import type { Metadata } from "next";
import type { Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/lib/toast";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCR!PTS",
  description: "A home for creative culture — the SCR!PTS flagship world.",
  appleWebApp: {
    capable: true,
    // "black-translucent" lets the page draw under the status bar instead of
    // iOS painting it solid black — needed for GameBoyShell's own safe-area
    // padding (shell grey) to actually show through the notch/status-bar area.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Deliberately NOT "cover". "cover" tells iOS Safari to draw our page edge
  // to edge under the status bar/notch — but in a plain (non-home-screen) tab
  // Safari always paints that area opaque black regardless of page content or
  // theme-color, so "cover" only bought us an unfixable black strip. Leaving
  // this at the default reserves the status bar's own space and lets our
  // shell start cleanly below it instead of fighting for it.
  themeColor: "#6F6F73",
};

// Used by the web/commerce pages (basement, inventory, products) via --font-bebas.
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bebasNeue.variable}>
      <head>
        {/* Next's `appleWebApp` metadata only emits the generic
            mobile-web-app-capable tag; iOS specifically looks for this
            apple- prefixed one to honor apple-mobile-web-app-status-bar-style. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      {/* Most routes are white commerce pages; body's own background is what
          iOS Safari's rubber-band overscroll reveals beneath a page's own div
          (see globals.css). Defaulting it to white — not ink — stops that gap
          flashing black behind Inventory/Cart/product pages. Plain white
          (not the brand `paper` token) matches those pages' own literal
          bg-white, so the overscroll gap is invisible rather than a visibly
          different off-white shade. The game world and dark (Basement)
          routes explicitly darken it back via a body class
          (body.game-active / body.dark-route). */}
      <body className="bg-white text-ink font-body antialiased">
        <CartProvider>
          <ToastProvider>
            {children}
            <CartDrawer />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
