"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

import { UserAvatar } from "@/components/general/userAvatar";
import { AdminNavMenu } from "@/components/admin/navMenu";
import { filterAdminNavGroups } from "@/components/admin/navItems";
import type { AdminResource } from "@/app/lib/permissions";

export function AdminSidebar({
  displayName,
  avatarUrl,
  roleName,
  isFullAccess,
  isSuperAdmin,
  permissions,
}: {
  displayName: string;
  avatarUrl: string | null;
  roleName: string;
  isFullAccess: boolean;
  isSuperAdmin: boolean;
  permissions: Record<AdminResource, string>;
}) {
  const groups = filterAdminNavGroups(permissions, isSuperAdmin);

  return (
    <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col items-start gap-7 overflow-y-auto border-l border-border bg-surface-alt px-4 py-7 lg:flex">
      <Link href="/" className="flex w-full items-center gap-3 px-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary shadow-[0_6px_20px_-8px] shadow-primary">
          <Shield size={18} className="text-white" />
        </div>
        <p className="text-[22px] font-black text-text" dir="auto">
          دوتامیت
        </p>
        <span
          className={`ms-auto rounded-[4px] border px-2 py-0.5 text-[11px] font-black ${
            isFullAccess ? "border-danger bg-danger/[0.12] text-danger" : "border-[#ff9f0a] bg-[#ff9f0a]/[0.12] text-[#ff9f0a]"
          }`}
          dir="auto"
        >
          {isFullAccess ? "مدیر" : "محدود"}
        </span>
      </Link>

      <AdminNavMenu groups={groups} className="flex-1" />

      <div className="flex w-full flex-col gap-4 px-2">
        <div className="h-px w-full bg-border" />
        <div className="flex w-full items-center gap-3">
          <UserAvatar name={displayName} avatarUrl={avatarUrl} size={40} round />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <p className="w-full truncate text-right text-[14px] font-bold text-text" dir="auto">
              {displayName}
            </p>
            <p className="text-[11px] text-text-dim" dir="auto">
              {isFullAccess ? "سطح دسترسی تام" : roleName}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
