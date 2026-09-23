import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { SHOP_CATEGORIES, SHOP_SORTS, type ShopCategory, type ShopSort } from "@/app/lib/shopCategories";
import { cn } from "@/app/lib/utils";

interface CategoryShellProps {
  category: ShopCategory;
  sort: ShopSort;
  showSort: boolean;
  sortHref: (sort: ShopSort) => string;
  /** Hide the market chip while the user market is switched off. */
  showMarket: boolean;
  /** Extra header content, e.g. the market's «ثبت آگهی» button. */
  action?: ReactNode;
  children: ReactNode;
}

/** Breadcrumb, title, category switcher and sort bar shared by every /shop category listing. */
export function CategoryShell({ category, sort, showSort, sortHref, showMarket, action, children }: CategoryShellProps) {
  return (
    <div className="flex w-full justify-center px-6 py-12 md:px-[100px]">
      <div className="flex w-full max-w-[1200px] flex-col gap-8">
        <nav className="flex items-center gap-1.5 text-[13px] text-text-dim" aria-label="مسیر">
          <Link href="/shop" className="hover:text-text">
            فروشگاه
          </Link>
          <ChevronLeft size={14} />
          <span className="text-text">{category.title}</span>
        </nav>

        <div className="flex w-full flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[30px] font-black text-text">{category.title}</h1>
            <p className="text-[14px] leading-[1.7] text-text-dim">{category.description}</p>
          </div>
          {action}
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap gap-2">
            {SHOP_CATEGORIES.filter((c) => showMarket || c.key !== "market").map((c) => (
              <Link
                key={c.key}
                href={`/shop/${c.key}`}
                className={cn(
                  "rounded-[20px] px-4 py-2 text-[13px] font-bold transition-colors",
                  c.key === category.key ? "bg-primary text-white" : "border border-border bg-surface text-text-dim hover:text-text",
                )}
              >
                {c.shortTitle}
              </Link>
            ))}
          </div>

          {showSort && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-text-dim">مرتب‌سازی:</span>
              {SHOP_SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={sortHref(s.key)}
                  className={cn("rounded-[6px] px-2.5 py-1 font-bold transition-colors", s.key === sort ? "bg-surface text-text" : "text-text-dim hover:text-text")}
                  rel="nofollow"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

export function parsePageParam(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function parseSortParam(value: string | string[] | undefined): ShopSort {
  const v = Array.isArray(value) ? value[0] : value;
  return SHOP_SORTS.some((s) => s.key === v) ? (v as ShopSort) : "new";
}

/** /shop/<key>?sort=..&page=.. with defaults omitted, so page 1 / newest stay on the canonical URL. */
export function categoryHref(key: string, page: number, sort: ShopSort) {
  const qs = new URLSearchParams();
  if (sort !== "new") qs.set("sort", sort);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return `/shop/${key}${s ? `?${s}` : ""}`;
}
