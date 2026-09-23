import Link from "next/link";

import { cn } from "@/app/lib/utils";

/**
 * Link-based twin of components/general/pagination.tsx for server-rendered
 * listings: real <a href>s so search engines can crawl every page. Same RTL
 * order (قبلی on the right) and a windowed page list with ellipses.
 */
export function ShopPagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;

  const pages = windowed(page, totalPages);
  const base = "rounded-[6px] px-3 py-1.5 text-[13px] transition-colors";
  const idle = "border border-border bg-surface text-text-dim hover:border-white/20 hover:text-text";
  const disabled = "pointer-events-none border border-border bg-surface text-text-dim opacity-40";

  return (
    <nav className="flex w-full flex-wrap items-center justify-center gap-2 pt-5" aria-label="صفحه‌بندی">
      <Link href={hrefFor(page - 1)} aria-disabled={page === 1} className={cn(base, page === 1 ? disabled : idle)} rel="prev">
        قبلی
      </Link>

      {pages.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-text-dim">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(base, "font-bold tabular-nums", p === page ? "bg-primary text-white" : idle)}
          >
            {p.toLocaleString("fa-IR")}
          </Link>
        ),
      )}

      <Link href={hrefFor(page + 1)} aria-disabled={page === totalPages} className={cn(base, page === totalPages ? disabled : idle)} rel="next">
        بعدی
      </Link>
    </nav>
  );
}

/** 1 … 4 5 6 … 20 — first, last and the current page's neighbours. */
function windowed(page: number, total: number): (number | null)[] {
  const keep = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}
