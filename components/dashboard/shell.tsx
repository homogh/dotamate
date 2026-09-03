"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

interface ShellUser {
  displayName: string;
  rankLabel: string;
}

const MOBILE_NAV_ITEMS = [
  { label: "داشبورد", href: "/dashboard" },
  { label: "مرور پست‌ها", href: "/dashboard/browse" },
  { label: "ایجاد پست", href: "/dashboard/create-post" },
  { label: "پست‌های من", href: "/dashboard/my-posts" },
  { label: "جلسات هماهنگ‌شده", href: "/dashboard/sessions" },
  { label: "علاقه‌مندی‌ها", href: "/dashboard/favorites" },
  { label: "پیام‌ها", href: "/dashboard/messages" },
  { label: "اعلان‌ها", href: "/dashboard/notifications" },
  { label: "پروفایل", href: "/dashboard/profile" },
  { label: "تنظیمات", href: "/dashboard/settings" },
];

export function DashboardShell({
  user,
  unreadMessages,
  unreadNotifications,
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadNotifications: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <DashboardSidebar user={user} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <DashboardTopbar
            unreadNotifications={unreadNotifications}
            mobileMenuOpen={mobileOpen}
            onToggleMobileMenu={() => setMobileOpen((v) => !v)}
          />

          {mobileOpen && (
            <div className="flex flex-col gap-1 border-b border-border bg-surface-alt px-4 py-4 lg:hidden">
              {MOBILE_NAV_ITEMS.map((item) => (
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
