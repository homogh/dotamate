"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Card } from "@/components/general/card";
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_STYLE } from "@/components/pages/contact/ticketLabels";

interface TicketDetail {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userName: string;
  messages: { id: number; body: string; isStaff: boolean; senderName: string; createdAt: string }[];
}

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/tickets/${params.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setTicket(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply() {
    if (!reply.trim()) return;
    setBusy(true);
    await fetch(`/api/admin/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    setReply("");
    setBusy(false);
    load();
  }

  async function handleClose() {
    setBusy(true);
    await fetch(`/api/admin/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setBusy(false);
    load();
  }

  if (loading || !ticket) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/tickets")} className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-text">
          بازگشت
        </button>
        <p className="flex-1 text-right text-[13px] text-text-dim" dir="auto">
          اولویت: {TICKET_PRIORITY_LABEL[ticket.priority]} • دسته: {TICKET_CATEGORY_LABEL[ticket.category]} • شناسه تیکت: #{ticket.id}
        </p>
      </div>

      <Card tone="surface" noHover className="w-full gap-2 p-6">
        <div className="flex w-full items-center justify-between">
          <span className={`rounded-[4px] border px-2.5 py-1 text-[11px] font-bold ${TICKET_STATUS_STYLE[ticket.status]}`} dir="auto">
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
          <p className="text-[16px] font-black text-text" dir="auto">
            تیکت فعال: {ticket.subject}
          </p>
        </div>
        <p className="w-full text-right text-[13px] text-text-dim" dir="auto">
          کاربر: {ticket.userName}
        </p>
      </Card>

      <Card tone="surface" noHover className="flex h-[420px] w-full flex-col gap-4 p-6">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`flex w-full flex-col gap-1.5 rounded-[8px] border p-3 ${
                m.isStaff ? "border-primary bg-primary/10" : "border-border bg-surface-alt"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <p className="text-[11px] text-text-dim">{new Date(m.createdAt).toLocaleString("fa-IR")}</p>
                <p className="text-[12px] font-bold text-text" dir="auto">
                  {m.isStaff ? "پشتیبانی دوتامیت" : m.senderName}
                </p>
              </div>
              <p className="w-full text-right text-[13px] text-text-dim" dir="auto">
                {m.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex w-full items-end gap-2">
          <button
            disabled={busy}
            onClick={handleReply}
            className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
            aria-label="ارسال پاسخ پشتیبان"
          >
            <Send size={16} />
          </button>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="پاسخ خود را در اینجا بنویسید..."
            rows={2}
            dir="auto"
            className="flex-1 resize-none rounded-[8px] border border-border bg-surface-alt px-4 py-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
        </div>
      </Card>

      <div className="flex w-full gap-3">
        <button
          disabled={busy || ticket.status === "CLOSED"}
          onClick={handleClose}
          className="flex-1 rounded-[8px] bg-danger p-3.5 text-[14px] font-bold text-white disabled:opacity-40"
          dir="auto"
        >
          بستن تیکت
        </button>
        <button
          disabled={busy}
          onClick={handleReply}
          className="flex-1 rounded-[8px] bg-primary p-3.5 text-[14px] font-bold text-white disabled:opacity-40"
          dir="auto"
        >
          ارسال پاسخ پشتیبان
        </button>
      </div>
    </div>
  );
}
