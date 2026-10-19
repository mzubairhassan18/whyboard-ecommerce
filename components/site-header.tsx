import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function Mark({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3" y="14" width="3.6" height="7" rx="1.1" fill="currentColor" opacity="0.45" />
      <rect x="10.2" y="9" width="3.6" height="12" rx="1.1" fill="currentColor" opacity="0.72" />
      <rect x="17.4" y="3" width="3.6" height="18" rx="1.1" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-canvas/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-canvas">
            <Mark />
          </span>
          <span className="font-mono text-sm tracking-tight text-ink">whyboard</span>
        </Link>

        <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          ecommerce
        </span>

        <nav className="ml-auto flex items-center gap-4 text-xs text-muted">
          <a
            href="https://github.com/mzubairhassan18/whyboard-core"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-1.5 transition-colors hover:text-ink sm:flex"
          >
            whyboard-core
            <ArrowUpRight className="size-3" />
          </a>
          <a
            href="https://www.npmjs.com/package/whyboard-core"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent/40 hover:text-ink"
          >
            npm i whyboard-core
          </a>
        </nav>
      </div>
    </header>
  );
}
