"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/app/lib/utils";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { AdminNavMenu } from "@/components/admin/navMenu";
import { filterAdminNavGroups } from "@/components/admin/navItems";
import type { AdminResource } from "@/app/lib/permissions";

export function AdminShell({
  displayName,
  avatarUrl,
  roleName,
  isFullAccess,
  isSuperAdmin,
  permissions,
  children,
}: {
  displayName: string;
  avatarUrl: string | null;
  roleName: string;
  isFullAccess: boolean;
  isSuperAdmin: boolean;
  permissions: Record<AdminResource, string>;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const groups = filterAdminNavGroups(permissions, isSuperAdmin);

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <AdminSidebar displayName={displayName} avatarUrl={avatarUrl} roleName={roleName} isFullAccess={isFullAccess} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <AdminTopbar mobileMenuOpen={mobileOpen} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />

          <div
            inert={!mobileOpen}
            className={cn(
              "grid border-b bg-surface-alt transition-[grid-template-rows,opacity,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
              mobileOpen ? "grid-rows-[1fr] border-border opacity-100" : "grid-rows-[0fr] border-transparent opacity-0"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="max-h-[calc(100dvh-80px)] overflow-y-auto px-4 py-4">
                <AdminNavMenu groups={groups} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
