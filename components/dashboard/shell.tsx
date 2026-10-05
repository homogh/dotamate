"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/app/lib/utils";
import { useNotifications } from "@/app/stores/useNotifications";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { DashboardNavMenu } from "@/components/dashboard/navMenu";

interface ShellUser {
  displayName: string;
  rankLabel: string;
  avatarUrl: string | null;
}

export function DashboardShell({
  user,
  unreadMessages,
  unreadNotifications,
  shopOpen,
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadNotifications: number;
  shopOpen: boolean;
  children: ReactNode;
}) {
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
      <DashboardSidebar user={user} shopOpen={shopOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <DashboardTopbar mobileMenuOpen={mobileOpen} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />

          <div
            inert={!mobileOpen}
            className={cn(
              "grid border-b bg-surface-alt transition-[grid-template-rows,opacity,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
              mobileOpen ? "grid-rows-[1fr] border-border opacity-100" : "grid-rows-[0fr] border-transparent opacity-0"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="max-h-[calc(100dvh-80px)] overflow-y-auto px-4 py-4">
                <DashboardNavMenu shopOpen={shopOpen} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
