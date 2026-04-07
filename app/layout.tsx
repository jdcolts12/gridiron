import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "./components/AuthHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridiron Dynasty",
  description: "Football franchise strategy game",
};

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stadium", label: "Stadium" },
  { href: "/squad", label: "Squad" },
  { href: "/match", label: "Match" },
  { href: "/league", label: "League" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-y-2 px-4 py-3 text-sm">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <Link
                href="/"
                className="mr-3 shrink-0 font-semibold tracking-tight text-emerald-400"
              >
                Gridiron Dynasty
              </Link>
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-2.5 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                >
                  {label}
                </Link>
              ))}
            </div>
            <AuthHeader />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
