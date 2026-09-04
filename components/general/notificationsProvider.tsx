"use client";

import { useEffect } from "react";

import { useAuth } from "@/app/stores/useAuth";
import { useNotifications } from "@/app/stores/useNotifications";

const POLL_INTERVAL_MS = 15000;

// Mounted once at the root layout so the unread bell/sidebar badges stay
// live everywhere — public pages included, not just inside /dashboard.
export function NotificationsProvider() {
  const status = useAuth((s) => s.status);
  const pollSummary = useNotifications((s) => s.pollSummary);

  useEffect(() => {
    if (status !== "authenticated") return;
    pollSummary();
    const interval = setInterval(pollSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status, pollSummary]);

  return null;
}
