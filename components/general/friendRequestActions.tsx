"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { useNotifications, type FriendRequestAnswer, type NotificationItem } from "@/app/stores/useNotifications";
import { useToast } from "@/app/stores/useToast";

/** Accept / decline buttons under a FRIEND_REQUEST notification (bell dropdown and /dashboard/notifications). */
export function FriendRequestActions({ notification, compact }: { notification: NotificationItem; compact?: boolean }) {
  const answerFriendRequest = useNotifications((s) => s.answerFriendRequest);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (notification.type !== "FRIEND_REQUEST" || !notification.friendRequest) return null;

  if (notification.friendRequest.status === "ACCEPTED") {
    return (
      <p className="flex items-center gap-1 self-end text-[12px] font-bold text-success" dir="auto">
        <Check size={13} />
        با هم دوست شدید
      </p>
    );
  }

  async function answer(value: FriendRequestAnswer) {
    setBusy(true);
    const result = await answerFriendRequest(notification.id, value);
    setBusy(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  const size = compact ? "px-3 py-1.5 text-[12px]" : "px-5 py-2 text-[13px]";

  return (
    <div className="flex items-center gap-2 self-end">
      <button
        type="button"
        onClick={() => answer("decline")}
        disabled={busy}
        className={cn("flex items-center gap-1 rounded-[8px] border border-border bg-surface-alt font-bold text-text-dim hover:text-text disabled:opacity-50", size)}
        dir="auto"
      >
        <X size={13} />
        رد کردن
      </button>
      <button
        type="button"
        onClick={() => answer("accept")}
        disabled={busy}
        className={cn("flex items-center gap-1 rounded-[8px] bg-primary font-bold text-white disabled:opacity-50", size)}
        dir="auto"
      >
        <Check size={13} />
        قبول کردن
      </button>
    </div>
  );
}
