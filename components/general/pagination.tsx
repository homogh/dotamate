import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/app/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  className?: string;
} & (
  | { onChange: (page: number) => void; hrefFor?: never }
  /** Link mode for server-rendered listings: real <a href>s so crawlers reach every page. */
  | { hrefFor: (page: number) => string; onChange?: never }
);

type Item = { kind: "page"; page: number } | { kind: "gap"; key: string };

/**
 * RTL-correct pagination: DOM order is prev → numbers → next, which in a
 * dir="rtl" page lands the "قبلی" arrow on the right (where reading starts) and
 * "بعدی" on the left — matching the LTR convention mirrored, not copied.
 *
 * Never renders every page: a window around the current page, the first and
 * last page, and (desktop only) a few multiples of 10 to jump far quickly —
 * e.g. 1 2 3 … 10 20 … 48. Mobile gets a tighter list so the row
 * never overflows a 360px screen.
 */
export function Pagination(props: PaginationProps) {
  const { page, totalPages, className } = props;
  if (totalPages <= 1) return null;

  const desktop = pageItems(page, totalPages, { radius: 1, jumps: 2 });
  const mobile = pageItems(page, totalPages, { radius: 1, jumps: 0 });

  return (
    <nav
      className={cn("flex w-full max-w-full items-center justify-center gap-1 pt-4", className)}
      aria-label="صفحه‌بندی"
    >
      <Step {...props} target={page - 1} disabled={page <= 1} label="قبلی" rel="prev" />

      <ul className="flex items-center gap-1 sm:hidden">
        <Items {...props} items={mobile} />
      </ul>
      <ul className="hidden items-center gap-1 sm:flex">
        <Items {...props} items={desktop} />
      </ul>

      <Step {...props} target={page + 1} disabled={page >= totalPages} label="بعدی" rel="next" />
    </nav>
  );
}

const cellBase =
  "inline-flex h-7 min-w-7 select-none items-center justify-center rounded-[7px] px-1.5 text-[12px] font-bold tabular-nums outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent sm:h-8 sm:min-w-8";
const cellIdle =
  "border border-border bg-surface text-text-dim hover:-translate-y-px hover:border-accent/50 hover:bg-surface-alt hover:text-text active:translate-y-0 active:scale-95";
const cellActive =
  "pagination-pop border border-transparent bg-primary text-white shadow-[0_4px_12px_-4px_var(--color-primary)]";
const cellDisabled = "pointer-events-none border border-border bg-surface text-text-dim opacity-35";

function Items(props: PaginationProps & { items: Item[] }) {
  const { items, page } = props;
  return items.map((item) =>
    item.kind === "gap" ? (
      <li key={item.key} aria-hidden className="w-3 text-center text-[12px] text-text-dim/70">
        …
      </li>
    ) : (
      <li key={item.page}>
        <Cell {...props} target={item.page} current={item.page === page} />
      </li>
    ),
  );
}

function Cell(props: PaginationProps & { target: number; current: boolean }) {
  const { target, current } = props;
  const className = cn(cellBase, current ? cellActive : cellIdle);
  const label = target.toLocaleString("fa-IR");
  const aria = { "aria-current": current ? ("page" as const) : undefined, "aria-label": `صفحه ${label}` };

  if (props.hrefFor) {
    return (
      <Link href={props.hrefFor(target)} className={className} {...aria}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => !current && props.onChange(target)} className={className} {...aria}>
      {label}
    </button>
  );
}

function Step(props: PaginationProps & { target: number; disabled: boolean; label: string; rel: "prev" | "next" }) {
  const { target, disabled, label, rel } = props;
  // In RTL "previous" sits on the right, so its arrow points right.
  const Icon = rel === "prev" ? ChevronRight : ChevronLeft;
  const className = cn(cellBase, "px-1.5", disabled ? cellDisabled : cellIdle);
  const content = (
    <>
      {rel === "prev" && <Icon className="size-3.5" aria-hidden />}
      
      {rel === "next" && <Icon className="size-3.5" aria-hidden />}
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled className={className} aria-label={label}>
        {content}
      </span>
    );
  }
  if (props.hrefFor) {
    return (
      <Link href={props.hrefFor(target)} rel={rel} className={className} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => props.onChange(target)} className={className} aria-label={label}>
      {content}
    </button>
  );
}

/**
 * Builds the visible page list. A contiguous window of 2·radius+1 pages
 * (shifted at the edges so it keeps its size), page 1 and the last page,
 * plus up to `jumps` multiples of 10 on each side of the window. Jumps sit
 * next to each other without ellipses ("10 20 30"); any other hole gets one.
 */
function pageItems(page: number, total: number, { radius, jumps }: { radius: number; jumps: number }): Item[] {
  const size = radius * 2 + 1;
  // Small enough to show everything without ellipses.
  if (total <= size + 2) return range(1, total).map((p) => ({ kind: "page", page: p }));

  let start = Math.max(1, page - radius);
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);

  const tens = range(1, Math.floor((total - 1) / 10)).map((n) => n * 10);
  const before = jumps ? tens.filter((p) => p < start).slice(-jumps) : [];
  const after = tens.filter((p) => p > end && p < total).slice(0, jumps);
  const jumpSet = new Set([...before, ...after]);

  const pages = [...new Set([1, ...before, ...range(start, end), ...after, total])].sort((a, b) => a - b);

  const out: Item[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev > 1 && !(jumpSet.has(p) && jumpSet.has(prev))) {
      out.push({ kind: "gap", key: `gap-${prev}-${p}` });
    }
    out.push({ kind: "page", page: p });
  });
  return out;
}

function range(from: number, to: number) {
  return to < from ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
