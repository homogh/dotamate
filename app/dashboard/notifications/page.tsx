"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Clock, MessageSquare, CheckCircle, Shield, Bell } from "lucide-react";

import { useNotifications } from "@/app/stores/useNotifications";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";

type NotifType = "POST_REQUEST" | "REQUEST_ACCEPTED" | "REQUEST_DECLINED" | "NEW_MESSAGE" | "SESSION_REMINDER" | "SYSTEM";

interface NotificationItem {
  id: number;
  type: NotifType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

type Filter = "all" | "reminder" | "response" | "invite";

const TYPE_ICON: Record<NotifType, typeof Bell> = {
  POST_REQUEST: MessageSquare,
  REQUEST_ACCEPTED: UserPlus,
  REQUEST_DECLINED: CheckCircle,
  NEW_MESSAGE: MessageSquare,
  SESSION_REMINDER: Clock,
  SYSTEM: Shield,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "دیروز";
  return `${days} روز پیش`;
}

function matchesFilter(n: NotificationItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "reminder") return n.type === "SESSION_REMINDER";
  if (filter === "invite") return n.type === "REQUEST_ACCEPTED" && n.title.includes("دعوت");
  if (filter === "response") return n.type === "POST_REQUEST" || n.type === "REQUEST_DECLINED" || (n.type === "REQUEST_ACCEPTED" && !n.title.includes("دعوت"));
  return true;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const notifications = useNotifications((s) => s.items) as NotificationItem[];
  const loadItems = useNotifications((s) => s.loadItems);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markRead = useNotifications((s) => s.markRead);

  useEffect(() => {
    loadItems().finally(() => setLoading(false));
  }, [loadItems]);

  async function handleMarkAllRead() {
    await markAllRead();
  }

  async function handleClick(n: NotificationItem) {
    if (!n.read) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  const filtered = notifications.filter((n) => matchesFilter(n, filter));

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <button
          onClick={handleMarkAllRead}
          className="rounded-[8px] border border-border bg-surface-alt px-4 py-2 text-[13px] font-bold text-text"
          dir="auto"
        >
          خواندن همه
        </button>
        <div className="flex items-center gap-2">
          {(
            [
              ["reminder", "یادآوری"],
              ["response", "پاسخ‌ها"],
              ["invite", "دعوت‌ها"],
              ["all", "همه"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-[13px] font-bold ${
                filter === value ? "border-primary bg-primary text-white" : "border-border bg-surface-alt text-white"
              }`}
              dir="auto"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <div className="flex w-full items-center justify-center rounded-[12px] border border-border bg-surface p-10">
          <p className="text-[14px] text-text-dim" dir="auto">
            اعلانی برای نمایش نیست.
          </p>
        </div>
      ) : (
        <DashboardFadeIn ready={!loading} className="flex w-full flex-col gap-3">
          {filtered.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-center gap-4 rounded-[12px] border p-5 text-right transition-colors ${
                  n.read ? "border-border bg-surface" : "border-primary bg-primary/10 hover:bg-primary/15"
                }`}
              >
                <p className="whitespace-nowrap text-[13px] text-text-dim">{timeAgo(n.createdAt)}</p>
                <div className="h-px flex-1 bg-transparent" />
                <p className="text-right text-[15px] font-bold text-text" dir="auto">
                  {n.title}
                </p>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-surface-alt">
                  <Icon size={20} className="text-accent" />
                </div>
              </button>
            );
          })}
        </DashboardFadeIn>
      )}
    </div>
  );
}
