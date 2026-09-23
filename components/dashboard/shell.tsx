"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNotifications } from "@/app/stores/useNotifications";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { shopNavVisible, type ShopAccess, type ShopNeed } from "@/components/dashboard/shopNav";

interface ShellUser {
  displayName: string;
  rankLabel: string;
  avatarUrl: string | null;
}

const MOBILE_NAV_ITEMS: { label: string; href: string; shop?: ShopNeed }[] = [
  { label: "داشبورد", href: "/dashboard" },
  { label: "مرور پست‌ها", href: "/dashboard/browse" },
  { label: "ایجاد پست", href: "/dashboard/create-post" },
  { label: "پست‌های من", href: "/dashboard/my-posts" },
  { label: "جلسات هماهنگ‌شده", href: "/dashboard/sessions" },
  { label: "دوستان", href: "/dashboard/friends" },
  { label: "علاقه‌مندی‌ها", href: "/dashboard/favorites" },
  { label: "پیام‌ها", href: "/dashboard/messages" },
  { label: "اعلان‌ها", href: "/dashboard/notifications" },
  { label: "سفارش‌های من", href: "/dashboard/orders", shop: "any" },
  { label: "آگهی‌های من", href: "/dashboard/listings", shop: "market" },
  { label: "فروش‌های من", href: "/dashboard/sales", shop: "market" },
  { label: "میت کیف", href: "/dashboard/wallet", shop: "any" },
  { label: "پروفایل", href: "/dashboard/profile" },
  { label: "تنظیمات", href: "/dashboard/settings" },
];

export function DashboardShell({
  user,
  unreadMessages,
  unreadNotifications,
  shopAccess,
  marketOpen,
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadNotifications: number;
  shopAccess: ShopAccess;
  marketOpen: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const setInitialCounts = useNotifications((s) => s.setInitialCounts);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    // Seeds the store with the SSR-accurate value so the badge never flashes
    // 0 before NotificationsProvider's own poll (mounted at the root layout)
    // resolves.
    setInitialCounts(unreadNotifications, unreadMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <DashboardSidebar user={user} shopAccess={shopAccess} marketOpen={marketOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <DashboardTopbar mobileMenuOpen={mobileOpen} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />

          {mobileOpen && (
            <div className="flex flex-col gap-1 border-b border-border bg-surface-alt px-4 py-4 lg:hidden">
              {MOBILE_NAV_ITEMS.filter((item) => shopNavVisible(item.shop, shopAccess, marketOpen)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-[8px] px-4 py-3 text-right text-sm font-bold ${
                    pathname === item.href ? "bg-primary text-white" : "text-text-dim hover:bg-white/5"
                  }`}
                  dir="auto"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
