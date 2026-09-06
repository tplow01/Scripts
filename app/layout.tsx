import type { Metadata } from "next";
import type { Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/lib/toast";
import { SFXProvider } from "@/lib/sfx";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCR!PTS",
  description: "A home for creative culture — the SCR!PTS flagship world.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
      <body className="bg-ink text-paper font-body antialiased">
        <SFXProvider>
          <CartProvider>
            <ToastProvider>
              {children}
              <CartDrawer />
            </ToastProvider>
          </CartProvider>
        </SFXProvider>
      </body>
    </html>
  );
}
