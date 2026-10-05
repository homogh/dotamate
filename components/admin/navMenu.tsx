"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { GroupedNav } from "@/components/general/groupedNav";
import { ADMIN_OVERVIEW_ITEM, type AdminNavGroup } from "@/components/admin/navItems";

export function AdminNavMenu({
  groups,
  onNavigate,
  className,
}: {
  groups: AdminNavGroup[];
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <GroupedNav
      root={ADMIN_OVERVIEW_ITEM}
      groups={groups}
      onNavigate={onNavigate}
      className={className}
      footer={
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="group/client flex w-full items-center gap-3 rounded-[12px] border border-dashed border-border px-3 py-2.5 text-text-dim transition-colors duration-300 hover:border-primary/60 hover:bg-primary/[0.06] hover:text-text"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.04]">
            <LayoutDashboard size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-[13px] font-bold" dir="auto">
            رفتن به پنل کلاینت
          </span>
          <ArrowLeft size={16} className="shrink-0 transition-transform duration-300 group-hover/client:-translate-x-1" />
        </Link>
      }
    />
  );
}
