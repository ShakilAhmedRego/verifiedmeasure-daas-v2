import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VerifiedMeasure — DaaS Control Plane",
  description:
    "A secure data access platform with preview + entitlement and ledger-based credits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-neutral-800 bg-neutral-950/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              {/* Brand */}
              <a href="/" className="flex items-center gap-3 whitespace-nowrap">
                {/* Logo placeholder (safe until VM logo exists) */}
                <div className="h-8 w-8 rounded-xl bg-neutral-800" />

                <div className="leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-wide text-white">
                      VerifiedMeasure
                    </span>

                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      DAAS
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400">
                    DaaS Control Plane
                  </div>
                </div>
              </a>

              {/* Nav */}
              <nav className="flex items-center gap-3 text-sm">
                <a
                  className="rounded-lg px-3 py-2 hover:bg-neutral-900"
                  href="/dashboard"
                >
                  Dashboard
                </a>
                <a
                  className="rounded-lg px-3 py-2 hover:bg-neutral-900"
                  href="/admin"
                >
                  Admin
                </a>
                <a
                  className="rounded-lg px-3 py-2 hover:bg-neutral-900"
                  href="/login"
                >
                  Login
                </a>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

          <footer className="border-t border-neutral-800 py-8">
            <div className="mx-auto max-w-6xl px-4 text-xs text-neutral-500">
              VerifiedMeasure — Data access platform. Preview + entitlement.
              Credits are ledger-based.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
