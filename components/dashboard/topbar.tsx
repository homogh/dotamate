"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";

import { HeroAvatar } from "@/components/general/heroAvatar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "پنل مدیریت هم‌تیمی",
  "/dashboard/browse": "مرور پست‌ها",
  "/dashboard/create-post": "ایجاد پست جدید",
  "/dashboard/my-posts": "پست‌های من",
  "/dashboard/sessions": "جلسات هماهنگ‌شده",
  "/dashboard/favorites": "علاقه‌مندی‌ها",
  "/dashboard/messages": "پیام‌ها",
  "/dashboard/notifications": "اعلان‌ها",
  "/dashboard/profile": "پروفایل",
  "/dashboard/settings": "تنظیمات",
};

export function DashboardTopbar({
  displayName,
  unreadNotifications,
  mobileMenuOpen,
  onToggleMobileMenu,
}: {
  displayName: string;
  unreadNotifications: number;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/dashboard/messages")
      ? "پیام‌ها"
      : pathname.startsWith("/dashboard/browse")
        ? "مرور پست‌ها"
        : "داشبورد");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(query.trim() ? `/dashboard/browse?query=${encodeURIComponent(query.trim())}` : "/dashboard/browse");
  }

  return (
    <header className="flex h-[80px] w-full shrink-0 items-center justify-between border-b border-border bg-bg-alt px-6 py-5 md:px-10">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className="relative flex size-10 items-center justify-center rounded-full border-2 border-success"
        >
          <HeroAvatar name={displayName} size={36} round />
        </Link>

        <Link
          href="/dashboard/notifications"
          className="relative flex size-10 items-center justify-center rounded-[8px] border border-border bg-surface-alt hover:bg-white/5"
          aria-label="اعلان‌ها"
        >
          <Bell size={18} className="text-text-dim" />
          {unreadNotifications > 0 && (
            <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#bf2e1a] text-[10px] font-bold text-white">
              {unreadNotifications > 9 ? "۹+" : unreadNotifications}
            </span>
          )}
        </Link>

        <form
          onSubmit={handleSearch}
          className="hidden w-[280px] items-center gap-2 rounded-[8px] border border-border bg-surface-alt py-2.5 pl-3 pr-4 sm:flex"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی لابی، بازیکن یا شناسه..."
            dir="auto"
            className="w-full bg-transparent text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
          <button type="submit" aria-label="جستجو">
            <Search size={16} className="text-text-dim" />
          </button>
        </form>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 lg:flex-none">
        <p className="truncate text-[20px] font-black text-text" dir="auto">
          {title}
        </p>
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-alt text-text lg:hidden"
            aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}
      </div>
    </header>
  );
}
