import { cn } from "@/app/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/**
 * RTL-correct pagination: DOM order is prev → numbers → next, which in a
 * dir="rtl" page lands "قبلی" on the right (where reading starts) and
 * "بعدی" on the left — matching the LTR convention mirrored, not copied.
 */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      className="flex w-full items-center justify-center gap-2 pt-5"
      aria-label="صفحه‌بندی"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-[13px] text-text-dim transition-colors hover:enabled:border-white/20 hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        قبلی
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-[13px] font-bold tabular-nums transition-colors",
            p === page
              ? "bg-primary text-white"
              : "border border-border bg-surface text-text-dim hover:border-white/20 hover:text-text"
          )}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-[6px] border border-border bg-surface px-3 py-1.5 text-[13px] text-text-dim transition-colors hover:enabled:border-white/20 hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        بعدی
      </button>
    </nav>
  );
}
