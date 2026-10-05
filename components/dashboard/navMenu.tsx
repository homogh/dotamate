"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { useNotifications } from "@/app/stores/useNotifications";
import { GroupedNav } from "@/components/general/groupedNav";
import { DASHBOARD_HOME_ITEM, filterDashboardNavGroups } from "@/components/dashboard/navItems";

export function DashboardNavMenu({
  shopOpen,
  onNavigate,
  className,
}: {
  shopOpen: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const unreadMessages = useNotifications((s) => s.unreadMessages);
  const unreadNotifications = useNotifications((s) => s.unreadNotifications);

  const groups = filterDashboardNavGroups(shopOpen, {
    "/dashboard/messages": unreadMessages,
    "/dashboard/notifications": unreadNotifications,
  });
  const creating = pathname === "/dashboard/create-post";

  return (
    <GroupedNav
      root={DASHBOARD_HOME_ITEM}
      groups={groups}
      onNavigate={onNavigate}
      className={className}
      header={
        // Posting a lobby is the panel's main action, so it lives outside the groups.
        <Link
          href="/dashboard/create-post"
          onClick={onNavigate}
          className={cn(
            "group/cta relative mb-2 flex w-full items-center gap-3 overflow-hidden rounded-[12px] px-3 py-2.5 text-white transition-all duration-300",
            "bg-gradient-to-l from-primary to-[#6b5cf0] shadow-[0_10px_28px_-12px] shadow-primary hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px]",
            creating && "ring-2 ring-accent/50 ring-offset-2 ring-offset-surface-alt"
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[420%]"
          />
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/cta:rotate-90">
            <Plus size={18} />
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-[14px] font-black" dir="auto">
            ایجاد پست جدید
          </span>
        </Link>
      }
    />
  );
}
