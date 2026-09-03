"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/stores/useAuth";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_STYLE } from "@/components/pages/contact/ticketLabels";

interface MyTicket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  lastMessage: string | null;
  lastMessageIsStaff: boolean;
}

interface ThreadMessage {
  id: number;
  body: string;
  isStaff: boolean;
  senderName: string;
  createdAt: string;
}

export function RecentTickets({ refreshKey }: { refreshKey?: number }) {
  const { status } = useAuth();
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [thread, setThread] = useState<ThreadMessage[] | null>(null);

  const load = useCallback(() => {
    if (status !== "authenticated") return;
    fetch("/api/tickets", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setTickets(json.data);
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function toggle(id: number) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setThread(null);
    const res = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (json.status === "success") setThread(json.data.messages);
  }

  if (status !== "authenticated") {
    return (
      <div className="w-full rounded-[12px] border border-border bg-surface-alt p-8 text-center text-sm text-text-dim" dir="auto">
        برای دیدن تیکت‌هات وارد حساب شو.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full rounded-[12px] border border-border bg-surface-alt p-8 text-center text-sm text-text-dim" dir="auto">
        در حال بارگذاری...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="w-full rounded-[12px] border border-border bg-surface-alt p-8 text-center text-sm text-text-dim" dir="auto">
        هنوز تیکتی ثبت نکردی.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[12px] border border-border">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid w-full grid-cols-[100px_1fr_180px_160px_150px_100px] gap-3 border-b border-border bg-bg-alt p-4 text-sm font-bold text-[rgba(255,255,255,0.5)]">
            <p className="text-center">شماره</p>
            <p className="text-right">موضوع تیکت</p>
            <p className="text-right">دسته‌بندی</p>
            <p className="text-center">وضعیت</p>
            <p className="text-right">تاریخ ثبت</p>
            <p className="text-center">عملیات</p>
          </div>

          {tickets.map((ticket, i) => (
            <div key={ticket.id}>
              <div
                className={cn(
                  "grid w-full grid-cols-[100px_1fr_180px_160px_150px_100px] items-center gap-3 bg-surface-alt p-4",
                  i < tickets.length - 1 && "border-b border-border",
                )}
              >
                <p className="text-center text-sm tabular-nums text-[rgba(255,255,255,0.5)]">#{ticket.id}</p>
                <p className="truncate text-right text-sm font-bold text-text" dir="auto">
                  {ticket.subject}
                </p>
                <p className="text-right text-sm text-text-dim" dir="auto">
                  {TICKET_CATEGORY_LABEL[ticket.category] ?? ticket.category}
                </p>
                <div className="flex justify-center">
                  <span
                    className={cn("rounded-[4px] border px-3 py-1 text-xs font-bold whitespace-nowrap", TICKET_STATUS_STYLE[ticket.status])}
                    dir="auto"
                  >
                    {TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
                  </span>
                </div>
                <p className="text-right text-sm tabular-nums text-text-dim" dir="auto">
                  {new Date(ticket.createdAt).toLocaleDateString("fa-IR")}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggle(ticket.id)}
                    className="rounded-[6px] border border-border px-3 py-1.5 text-xs text-text transition-colors hover:border-white/20"
                  >
                    {openId === ticket.id ? "بستن" : "مشاهده"}
                  </button>
                </div>
              </div>

              {openId === ticket.id && (
                <div className="flex w-full flex-col gap-3 border-b border-border bg-bg-alt p-4">
                  {thread === null ? (
                    <p className="text-center text-xs text-text-dim">در حال بارگذاری...</p>
                  ) : thread.length === 0 ? (
                    <p className="text-center text-xs text-text-dim">پیامی ثبت نشده.</p>
                  ) : (
                    thread.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex w-full flex-col gap-1 rounded-[8px] p-3 text-right",
                          m.isStaff ? "border border-primary bg-primary/10" : "bg-surface-alt",
                        )}
                        dir="auto"
                      >
                        <p className="text-[11px] font-bold text-text-dim">
                          {m.isStaff ? `پشتیبانی دوتامیت` : m.senderName} • {new Date(m.createdAt).toLocaleString("fa-IR")}
                        </p>
                        <p className="text-[13px] text-text">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
