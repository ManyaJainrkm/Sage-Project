/** Instrument-frame chrome: brand mark, the in-session privacy note, footer. */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/brand/sage-owl-final.png"
              alt="Sage"
              className="h-8 w-8 object-contain"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.28em] text-gold">SAGE</div>
              <div className="text-[0.68rem] text-muted">Know the gap. Close it.</div>
            </div>
          </Link>
          <span
            className="hidden items-center gap-2 text-[0.7rem] text-muted sm:flex"
            title="Your resume is analyzed in-session and never stored on a server."
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-positive" />
            Analyzed in-session, never stored
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-5 text-[0.7rem] text-muted">
          <span>
            Sage reasons about the distance between your experience and a target role. It only
            references experience present in your resume — it never invents or embellishes.
          </span>
          <span>
            Seeded postings are a curated representative sample for the demo, not live listings.
          </span>
        </div>
      </footer>
    </div>
  );
}
