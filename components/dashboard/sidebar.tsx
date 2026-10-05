"use client";

import Link from "next/link";

import { UserAvatar } from "@/components/general/userAvatar";
import { DashboardNavMenu } from "@/components/dashboard/navMenu";

interface SidebarUser {
  displayName: string;
  rankLabel: string;
  avatarUrl: string | null;
}

export function DashboardSidebar({ user, shopOpen }: { user: SidebarUser; shopOpen: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col items-start gap-7 overflow-y-auto border-l border-border bg-surface-alt px-4 py-7 lg:flex">
      <Link href="/" className="flex w-full items-center gap-3 px-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary shadow-[0_6px_20px_-8px] shadow-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <p className="text-[22px] font-black text-text" dir="auto">
          دوتامیت
        </p>
      </Link>

      <DashboardNavMenu shopOpen={shopOpen} className="flex-1" />

      <div className="flex w-full flex-col gap-4 px-2">
        <div className="h-px w-full bg-border" />
        <Link href="/dashboard/profile" className="group/me flex w-full items-center gap-3">
          <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={40} round />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <p className="w-full truncate text-right text-sm font-bold text-text transition-colors group-hover/me:text-accent" dir="auto">
              {user.displayName}
            </p>
            <p className="text-xs text-text-dim" dir="auto">
              {user.rankLabel}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
