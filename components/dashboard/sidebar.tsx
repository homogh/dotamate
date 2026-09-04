"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Search,
  PlusCircle,
  ClipboardList,
  CalendarClock,
  Heart,
  MessageSquare,
  Bell,
  User,
  Settings,
} from "lucide-react";

import { useNotifications } from "@/app/stores/useNotifications";
import { UserAvatar } from "@/components/general/userAvatar";

interface SidebarUser {
  displayName: string;
  rankLabel: string;
  avatarUrl: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  badge?: number;
}

function buildNavItems(unreadMessages: number, unreadNotifications: number): NavItem[] {
  return [
    { label: "داشبورد", href: "/dashboard", icon: LayoutGrid },
    { label: "مرور پست‌ها", href: "/dashboard/browse", icon: Search },
    { label: "ایجاد پست", href: "/dashboard/create-post", icon: PlusCircle },
    { label: "پست‌های من", href: "/dashboard/my-posts", icon: ClipboardList },
    { label: "جلسات هماهنگ‌شده", href: "/dashboard/sessions", icon: CalendarClock },
    { label: "علاقه‌مندی‌ها", href: "/dashboard/favorites", icon: Heart },
    { label: "پیام‌ها", href: "/dashboard/messages", icon: MessageSquare, badge: unreadMessages },
    { label: "اعلان‌ها", href: "/dashboard/notifications", icon: Bell, badge: unreadNotifications },
    { label: "پروفایل", href: "/dashboard/profile", icon: User },
    { label: "تنظیمات", href: "/dashboard/settings", icon: Settings },
  ];
}

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const unreadMessages = useNotifications((s) => s.unreadMessages);
  const unreadNotifications = useNotifications((s) => s.unreadNotifications);
  const navItems = buildNavItems(unreadMessages, unreadNotifications);

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col items-start gap-10 overflow-y-auto border-l border-border bg-surface-alt px-6 py-8 lg:flex">
      <Link href="/" className="flex w-full items-center justify-end gap-3">
        <p className="text-[24px] font-black text-text" dir="auto">
          دوتامیت
        </p>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </Link>

      <nav className="flex w-full flex-col items-start gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center justify-end gap-3 rounded-[10px] px-4 py-3 text-sm transition-colors ${
                active
                  ? "bg-primary font-bold text-white"
                  : "font-medium text-text-dim hover:bg-white/5 hover:text-text"
              }`}
            >
              {!!item.badge && (
                <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              <span className="min-w-0 flex-1 text-right" dir="auto">
                {item.label}
              </span>
              <Icon size={18} className={active ? "text-white" : "text-text-dim"} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col gap-4">
        <div className="h-px w-full bg-border" />
        <Link href="/dashboard/profile" className="flex w-full items-center justify-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
            <p className="truncate text-sm font-bold text-text" dir="auto">
              {user.displayName}
            </p>
            <p className="text-xs text-text-dim" dir="auto">
              {user.rankLabel}
            </p>
          </div>
          <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={40} round />
        </Link>
      </div>
    </aside>
  );
}
