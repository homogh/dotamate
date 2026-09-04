"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, UserPlus, Clock, MessageSquare, CheckCircle, Shield } from "lucide-react";

import { useNotifications } from "@/app/stores/useNotifications";

const TYPE_ICON: Record<string, typeof Bell> = {
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

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const { unreadNotifications, items, itemsLoaded, loadItems, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && !itemsLoaded) loadItems();
      return next;
    });
  }

  async function handleClick(n: { id: number; read: boolean; link: string | null }) {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  const recent = items.slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative flex size-10 items-center justify-center rounded-[8px] border border-border bg-surface-alt hover:bg-white/5"
        aria-label="اعلان‌ها"
      >
        <Bell size={18} className="text-text-dim" />
        {unreadNotifications > 0 && (
          <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadNotifications > 9 ? "۹+" : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-80 rounded-[10px] border border-border bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex w-full items-center justify-between border-b border-border px-4 py-3">
            <button onClick={markAllRead} className="text-[12px] font-bold text-accent" dir="auto">
              خواندن همه
            </button>
            <p className="text-[14px] font-black text-text" dir="auto">
              اعلان‌ها
            </p>
          </div>

          <div className="no-scrollbar flex max-h-[360px] w-full flex-col overflow-y-auto">
            {!itemsLoaded ? (
              <p className="w-full p-6 text-center text-[13px] text-text-dim" dir="auto">
                در حال بارگذاری...
              </p>
            ) : recent.length === 0 ? (
              <p className="w-full p-6 text-center text-[13px] text-text-dim" dir="auto">
                اعلانی نداری.
              </p>
            ) : (
              recent.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-center gap-3 border-b border-border/60 p-3 text-right last:border-b-0 ${
                      n.read ? "hover:bg-white/5" : "bg-primary/10 hover:bg-primary/15"
                    }`}
                  >
                    <p className="shrink-0 text-[11px] text-text-dim">{timeAgo(n.createdAt)}</p>
                    <p className="flex-1 truncate text-[13px] font-bold text-text" dir="auto">
                      {n.title}
                    </p>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-surface-alt">
                      <Icon size={16} className="text-accent" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center border-t border-border p-3 text-[12px] font-bold text-accent"
            dir="auto"
          >
            مشاهده همه اعلان‌ها
          </Link>
        </div>
      )}
    </div>
  );
}
