import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegioBus — Regional coach tickets",
  description: "Book affordable, comfortable coach travel across the region.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-brand px-4 py-3 text-white">
            <Link href="/" className="text-lg font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-white/40">
              RegioBus
            </Link>
            <Link href="/orders" className="text-sm font-medium opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40">
              My trips
            </Link>
          </header>
          <main className="flex-1 px-4 py-4 pb-28" id="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
