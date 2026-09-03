"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";

import { AccountMenu } from "@/components/general/accountMenu";
import { ADMIN_NAV_ITEMS } from "@/components/admin/navItems";

export function AdminTopbar({
  mobileMenuOpen,
  onToggleMobileMenu,
}: {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const title = ADMIN_NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "پیشخوان مدیریت دوتامیت";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) router.push(`/admin/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="flex h-[80px] w-full shrink-0 items-center justify-between border-b border-border bg-bg-alt px-6 py-5 md:px-10">
      <div className="flex items-center gap-4">
        <div className="rounded-full border-2 border-primary">
          <AccountMenu size={36} />
        </div>

        <div className="flex size-10 items-center justify-center rounded-[8px] border border-border bg-surface-alt">
          <Bell size={18} className="text-text-dim" />
        </div>

        <form
          onSubmit={handleSearch}
          className="hidden w-[280px] items-center gap-2 rounded-[8px] border border-border bg-surface-alt py-2.5 pl-3 pr-4 sm:flex"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، آیدی یا شناسه..."
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
