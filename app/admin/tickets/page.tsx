"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Zap, CheckCircle } from "lucide-react";

import { Card } from "@/components/general/card";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_STYLE,
} from "@/components/pages/contact/ticketLabels";

interface AdminTicket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  userName: string;
  lastMessage: string | null;
  lastMessageAt: string;
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [counts, setCounts] = useState({ open: 0, answeredToday: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return fetch(`/api/admin/tickets?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setTickets(json.data.tickets);
          setCounts(json.data.counts);
        }
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Clock} label="تیکت‌های باز" value={counts.open} />
        <KpiCard icon={Zap} label="پاسخ داده‌شده امروز" value={counts.answeredToday} />
        <KpiCard icon={CheckCircle} label="میانگین زمان پاسخ" value="~" suffix="بر اساس فعالیت اخیر" />
      </div>

      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center gap-3 p-5">
        {[
          { value: "", label: "همه وضعیت‌ها" },
          { value: "OPEN", label: "در انتظار بررسی" },
          { value: "IN_REVIEW", label: "در حال بررسی" },
          { value: "ANSWERED", label: "پاسخ داده شده" },
          { value: "CLOSED", label: "بسته شده" },
        ].map((o) => (
          <button
            key={o.value}
            onClick={() => setStatus(o.value)}
            className={`rounded-[8px] px-4 py-2 text-[13px] ${
              status === o.value ? "bg-primary font-bold text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            {o.label}
          </button>
        ))}
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[820px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">شماره تیکت</th>
                <th className="p-3 text-right font-bold">کاربر</th>
                <th className="p-3 text-right font-bold">موضوع</th>
                <th className="p-3 text-right font-bold">دسته‌بندی</th>
                <th className="p-3 text-right font-bold">اولویت</th>
                <th className="p-3 text-right font-bold">وضعیت</th>
                <th className="p-3 text-right font-bold">آخرین پاسخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    تیکتی نیست.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/tickets/${t.id}`)}
                    className="cursor-pointer border-b border-border text-[13px] hover:bg-white/[0.03]"
                  >
                    <td className="p-3 text-text-dim">#{t.id}</td>
                    <td className="p-3 font-bold text-text" dir="auto">
                      {t.userName}
                    </td>
                    <td className="p-3 font-extrabold text-text" dir="auto">
                      {t.subject}
                    </td>
                    <td className="p-3 text-accent" dir="auto">
                      {TICKET_CATEGORY_LABEL[t.category]}
                    </td>
                    <td className="p-3 text-text-dim" dir="auto">
                      {TICKET_PRIORITY_LABEL[t.priority]}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-[4px] border px-2.5 py-1 text-[11px] font-bold ${TICKET_STATUS_STYLE[t.status]}`} dir="auto">
                        {TICKET_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="p-3 text-text-dim">{timeAgo(t.lastMessageAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix }: { icon: typeof Clock; label: string; value: number | string; suffix?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-5">
      <div className="flex w-full items-center justify-between">
        <div className="flex size-6 items-center justify-center rounded-[6px] bg-surface-alt">
          <Icon size={14} className="text-text-dim" />
        </div>
        <p className="text-[13px] text-text-dim" dir="auto">
          {label}
        </p>
      </div>
      <div className="flex w-full items-baseline justify-between">
        {suffix && (
          <p className="text-[11px] text-text-dim" dir="auto">
            {suffix}
          </p>
        )}
        <p className="text-[24px] font-black text-text">{typeof value === "number" ? value.toLocaleString("fa-IR") : value}</p>
      </div>
    </div>
  );
}
