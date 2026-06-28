import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCR!PTS",
  description: "A home for creative culture — the SCR!PTS flagship world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ink text-paper font-body antialiased">{children}</body>
    </html>
  );
}
