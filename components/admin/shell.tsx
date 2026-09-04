"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { ADMIN_NAV_ITEMS } from "@/components/admin/navItems";
import type { AdminResource } from "@/app/lib/permissions";

export function AdminShell({
  displayName,
  avatarUrl,
  roleName,
  isFullAccess,
  permissions,
  children,
}: {
  displayName: string;
  avatarUrl: string | null;
  roleName: string;
  isFullAccess: boolean;
  permissions: Record<AdminResource, string>;
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

  const visibleItems = ADMIN_NAV_ITEMS.filter(
    (item) => item.resource === null || permissions[item.resource] === "VIEW" || permissions[item.resource] === "EDIT",
  );

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <AdminSidebar displayName={displayName} avatarUrl={avatarUrl} roleName={roleName} isFullAccess={isFullAccess} permissions={permissions} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <AdminTopbar mobileMenuOpen={mobileOpen} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />

          {mobileOpen && (
            <div className="flex flex-col gap-1 border-b border-border bg-surface-alt px-4 py-4 lg:hidden">
              {visibleItems.map((item) => (
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
