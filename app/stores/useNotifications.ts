import { create } from "zustand";

import { playNotificationSound } from "@/app/lib/notificationSound";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  friendRequest?: { id: number; status: "PENDING" | "ACCEPTED" } | null;
}

export type FriendRequestAnswer = "accept" | "decline";

interface NotificationState {
  unreadNotifications: number;
  unreadMessages: number;
  items: NotificationItem[];
  itemsLoaded: boolean;
  pollSummary: () => Promise<void>;
  loadItems: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  answerFriendRequest: (notificationId: number, answer: FriendRequestAnswer) => Promise<{ ok: boolean; message: string }>;
  setInitialCounts: (unreadNotifications: number, unreadMessages: number) => void;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  unreadNotifications: 0,
  unreadMessages: 0,
  items: [],
  itemsLoaded: false,

  setInitialCounts: (unreadNotifications, unreadMessages) => {
    set({ unreadNotifications, unreadMessages });
  },

  pollSummary: async () => {
    try {
      const res = await fetch("/api/dashboard/notifications/summary", { cache: "no-store" });
      const json = await res.json();
      if (json.status !== "success") return;
      const prev = get().unreadNotifications;
      const next = json.data.unreadNotifications as number;
      if (next > prev) playNotificationSound();
      set({ unreadNotifications: next, unreadMessages: json.data.unreadMessages });
    } catch {
      // Silent — this is a background poll, a transient failure isn't worth surfacing.
    }
  },

  loadItems: async () => {
    try {
      const res = await fetch("/api/dashboard/notifications", { cache: "no-store" });
      const json = await res.json();
      if (json.status === "success") set({ items: json.data, itemsLoaded: true });
    } catch {
      // ignore
    }
  },

  markAllRead: async () => {
    set((state) => ({ unreadNotifications: 0, items: state.items.map((n) => ({ ...n, read: true })) }));
    await fetch("/api/dashboard/notifications", { method: "PATCH" });
  },

  markRead: async (id) => {
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - (state.items.find((n) => n.id === id && !n.read) ? 1 : 0)),
      items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  },

  answerFriendRequest: async (notificationId, answer) => {
    const item = get().items.find((n) => n.id === notificationId);
    if (!item?.friendRequest) return { ok: false, message: "این درخواست دیگه معتبر نیست." };

    const res = await fetch(`/api/friends/requests/${item.friendRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: answer }),
    });
    const json = await res.json().catch(() => null);

    // A stale request (cancelled by the sender, already answered elsewhere)
    // is dropped from the item either way so its buttons go away.
    const friendRequest = json?.status === "success" && answer === "accept" ? { id: item.friendRequest.id, status: "ACCEPTED" as const } : null;
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - (item.read ? 0 : 1)),
      items: state.items.map((n) => (n.id === notificationId ? { ...n, read: true, friendRequest } : n)),
    }));
    if (!item.read) fetch(`/api/notifications/${notificationId}`, { method: "PATCH" }).catch(() => {});

    return { ok: json?.status === "success", message: json?.message ?? "خطایی پیش اومد." };
  },
}));
