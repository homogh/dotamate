"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  MessageSquare,
  AlertTriangle,
  Ticket,
  Calendar,
  FileText,
  Database,
  Bell,
  Shield,
  Terminal,
} from "lucide-react";

import { HeroAvatar } from "@/components/general/heroAvatar";
import { ADMIN_NAV_ITEMS } from "@/components/admin/navItems";
import type { AdminResource } from "@/app/lib/permissions";

const ICONS: Record<string, typeof LayoutGrid> = {
  "/admin": LayoutGrid,
  "/admin/users": Users,
  "/admin/posts": MessageSquare,
  "/admin/reports": AlertTriangle,
  "/admin/tickets": Ticket,
  "/admin/sessions": Calendar,
  "/admin/blog": FileText,
  "/admin/reference": Database,
  "/admin/announcements": Bell,
  "/admin/roles": Shield,
  "/admin/audit-log": Terminal,
};

export function AdminSidebar({
  displayName,
  roleName,
  isFullAccess,
  permissions,
}: {
  displayName: string;
  roleName: string;
  isFullAccess: boolean;
  permissions: Record<AdminResource, string>;
}) {
  const pathname = usePathname();

  const visibleItems = ADMIN_NAV_ITEMS.filter(
    (item) => item.resource === null || permissions[item.resource] === "VIEW" || permissions[item.resource] === "EDIT",
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col items-start gap-8 overflow-y-auto border-l border-border bg-surface-alt px-5 py-8 lg:flex">
      <div className="flex w-full items-center justify-center gap-3">
        <span
          className={`rounded-[4px] border px-2 py-0.5 text-[11px] font-black ${
            isFullAccess ? "border-danger bg-danger/[0.12] text-danger" : "border-[#ff9f0a] bg-[#ff9f0a]/[0.12] text-[#ff9f0a]"
          }`}
          dir="auto"
        >
          {isFullAccess ? "مدیر" : "محدود"}
        </span>
        <p className="text-[22px] font-black text-text" dir="auto">
          دوتامیت
        </p>
        <div className="flex size-8 items-center justify-center rounded-[8px] bg-primary">
          <Shield size={18} className="text-white" />
        </div>
      </div>

      <nav className="flex w-full flex-1 flex-col gap-1.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.href] ?? LayoutGrid;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center justify-end gap-3 rounded-[10px] px-4 py-3 text-[14px] transition-colors ${
                active ? "bg-primary font-bold text-white" : "font-medium text-white/90 hover:bg-white/5"
              }`}
            >
              <span dir="auto">{item.label}</span>
              <Icon size={18} className={active ? "text-white" : "text-white/70"} />
            </Link>
          );
        })}
      </nav>

      <div className="flex w-full flex-col gap-4">
        <div className="h-px w-full bg-border" />
        <div className="flex w-full items-center justify-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
            <p className="truncate text-[14px] font-bold text-text" dir="auto">
              {displayName}
            </p>
            <p className="text-[11px] text-text-dim" dir="auto">
              {isFullAccess ? "سطح دسترسی تام" : roleName}
            </p>
          </div>
          <HeroAvatar name={displayName} size={40} round />
        </div>
      </div>
    </aside>
  );
}
