"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, UserX, CheckCircle } from "lucide-react";

import { Card } from "@/components/general/card";

interface AdminReport {
  id: number;
  reportedUserName: string;
  reportedUserId: number | null;
  reporterName: string;
  severity: string;
  severityLabel: string;
  context: string;
  reason: string;
  status: string;
  action: string;
  createdAt: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "border-border bg-surface-alt text-text-dim",
  MEDIUM: "border-success bg-success/[0.13] text-success",
  HIGH: "border-[#ff9f0a] bg-[#ff9f0a]/[0.12] text-[#ff9f0a]",
  CRITICAL: "border-danger bg-danger/[0.12] text-danger",
};

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [counts, setCounts] = useState({ pending: 0, banned: 0, reviewedToday: 0 });
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/admin/reports?tab=${tab}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setCounts(json.data.counts);
          setReports(json.data.reports);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: number, action: "ban" | "suspend" | "dismiss") {
    setBusyId(id);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={AlertTriangle} label="گزارش‌های در انتظار" value={counts.pending} note={`${counts.pending} مورد جدید`} noteCls="text-[#ff9f0a]" />
        <KpiCard icon={UserX} label="کاربران مسدود شده" value={counts.banned} note="مجموع کل" noteCls="text-danger" />
        <KpiCard icon={CheckCircle} label="بررسی شده امروز" value={counts.reviewedToday} note="بایگانی فعال" noteCls="text-success" />
      </div>

      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("reviewed")}
            className={`rounded-[8px] px-5 py-2.5 text-[14px] font-bold ${
              tab === "reviewed" ? "bg-primary text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            بررسی‌شده
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`rounded-[8px] px-5 py-2.5 text-[14px] font-bold ${
              tab === "pending" ? "bg-primary text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            در انتظار بررسی ({counts.pending})
          </button>
        </div>
        <p className="text-[16px] font-bold text-text" dir="auto">
          لیست گزارش‌های اخیر کاربران در لابی و چت
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {loading ? (
          <div className="flex h-40 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
        ) : reports.length === 0 ? (
          <Card tone="surface" noHover className="w-full items-center p-8 text-center">
            <p className="text-[13px] text-text-dim" dir="auto">
              {tab === "pending" ? "گزارش بازی برای بررسی نیست." : "گزارش بررسی‌شده‌ای نیست."}
            </p>
          </Card>
        ) : (
          reports.map((r) => (
            <Card key={r.id} tone="surface" noHover className="w-full gap-4 p-5">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-dim" dir="auto">
                      کاربر متخلف:
                    </span>
                    <span className="text-[15px] font-black text-text" dir="auto">
                      {r.reportedUserName}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-dim" dir="auto">
                      گزارش‌دهنده:
                    </span>
                    <span className="text-[14px] font-bold text-text-dim" dir="auto">
                      {r.reporterName}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <span className={`rounded-[6px] border px-2.5 py-1 text-[12px] font-black ${SEVERITY_STYLE[r.severity]}`} dir="auto">
                    {r.severityLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] text-text-dim">{timeAgo(r.createdAt)}</p>
                  <span className="rounded-[4px] bg-surface-alt px-2 py-1 text-[11px] text-accent" dir="auto">
                    {r.context}
                  </span>
                </div>
              </div>

              <p className="w-full text-right text-[14px] leading-[1.6] text-text-dim" dir="auto">
                علت گزارش: {r.reason}
              </p>

              <div className="flex w-full items-center justify-between border-t border-border pt-3">
                {tab === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === r.id || !r.reportedUserId}
                      onClick={() => act(r.id, "ban")}
                      className="rounded-[6px] border border-danger bg-danger px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                      dir="auto"
                    >
                      مسدود کردن (Ban)
                    </button>
                    <button
                      disabled={busyId === r.id || !r.reportedUserId}
                      onClick={() => act(r.id, "suspend")}
                      className="rounded-[6px] border border-[#ff9f0a] bg-[#ff9f0a]/[0.12] px-3.5 py-2 text-[13px] font-bold text-[#ff9f0a] disabled:opacity-40"
                      dir="auto"
                    >
                      تعلیق موقت
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, "dismiss")}
                      className="rounded-[6px] border border-border px-3.5 py-2 text-[13px] font-bold text-text disabled:opacity-40"
                      dir="auto"
                    >
                      رد گزارش
                    </button>
                  </div>
                ) : (
                  <span className="text-[12px] text-text-dim" dir="auto">
                    نتیجه: {r.action === "BANNED" ? "مسدود شد" : r.action === "SUSPENDED" ? "تعلیق شد" : "رد شد"}
                  </span>
                )}
                <p className="text-[13px] text-text-dim" dir="auto">
                  شناسه پیگیری: #{r.id}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  noteCls,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  note: string;
  noteCls: string;
}) {
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
        <p className={`text-[11px] font-bold ${noteCls}`} dir="auto">
          {note}
        </p>
        <p className="text-[24px] font-black text-text">{value.toLocaleString("fa-IR")}</p>
      </div>
    </div>
  );
}
