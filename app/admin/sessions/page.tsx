"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { GAME_MODE_OPTIONS } from "@/components/dashboard/postLabels";

interface AdminSession {
  id: number;
  status: string;
  statusOverride: { label: string; cls: string } | null;
  memberCount: number;
  partySize: number;
  gameMode: string;
  startAt: string | null;
  hostName: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "همه موارد" },
  { value: "ACTIVE", label: "در حال ثبت‌نام" },
  { value: "FULL", label: "آماده بازی" },
  { value: "COMPLETED", label: "کامل‌شده" },
  { value: "CANCELLED", label: "لغو‌شده" },
];

export default function AdminSessionsPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [gameMode, setGameMode] = useState("");
  const [status, setStatus] = useState("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (gameMode) params.set("gameMode", gameMode);
    if (status) params.set("status", status);
    return fetch(`/api/admin/sessions?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setSessions(json.data.sessions);
          setActiveCount(json.data.activeCount);
        }
      })
      .finally(() => setLoading(false));
  }, [gameMode, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(id: number) {
    if (!(await confirmAction({ message: "مطمئنی می‌خوای این جلسه رو لغو کنی؟", danger: true, confirmLabel: "لغو جلسه" }))) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/sessions/${id}`, { method: "PATCH" });
    const json = await res.json().catch(() => null);
    setBusyId(null);
    if (res.ok) toast.success(json?.message ?? "جلسه لغو شد.");
    else toast.error(json?.message ?? "لغو جلسه با خطا مواجه شد.");
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white" dir="auto">
            اعمال فیلتر
          </span>
          <select
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value)}
            className="rounded-[6px] border border-border bg-surface-alt px-4 py-2 text-[13px] text-text"
            dir="auto"
          >
            <option value="">حالت بازی: همه</option>
            {GAME_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-[6px] border border-border bg-surface-alt px-4 py-2 text-[13px] text-text"
            dir="auto"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <p className="flex items-center gap-2 text-[14px] text-text-dim" dir="auto">
          تعداد جلسات هماهنگ‌شده فعال در پلتفرم:
          <span className="text-[18px] font-black text-accent">{activeCount.toLocaleString("fa-IR")} جلسه فعال</span>
        </p>
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">عملیات مدیریت</th>
                <th className="p-3 text-right font-bold">وضعیت جلسه</th>
                <th className="p-3 text-right font-bold">اعضای پارتی</th>
                <th className="p-3 text-right font-bold">حالت بازی</th>
                <th className="p-3 text-right font-bold">تاریخ و ساعت برگزاری</th>
                <th className="p-3 text-right font-bold">میزبان لابی</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-text-dim">
                    جلسه‌ای پیدا نشد.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const canCancel = s.status === "ACTIVE" || s.status === "FULL";
                  const readyLabel = s.status === "FULL" ? { label: "آماده بازی", cls: "bg-success/[0.12] text-success" } : { label: "در حال ثبت‌نام", cls: "bg-accent/[0.12] text-accent" };
                  const badge = s.statusOverride ?? readyLabel;
                  return (
                    <tr key={s.id} className="border-b border-border text-[13px]">
                      <td className="p-3">
                        {canCancel ? (
                          <button
                            disabled={busyId === s.id}
                            onClick={() => handleCancel(s.id)}
                            className="rounded-[6px] border border-danger bg-danger/10 px-3 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                            dir="auto"
                          >
                            لغو این جلسه
                          </button>
                        ) : (
                          <span className="text-[12px] text-text-dim" dir="auto">
                            غیرقابل اقدام
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-[6px] px-2.5 py-1 text-[12px] font-black ${badge.cls}`} dir="auto">
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-text-dim" dir="auto">
                        {s.memberCount} از {s.partySize} کاربر
                      </td>
                      <td className="p-3 text-text-dim">{s.gameMode}</td>
                      <td className="p-3 text-text-dim">
                        {s.startAt
                          ? new Date(s.startAt).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </td>
                      <td className="p-3 font-bold text-text" dir="auto">
                        {s.hostName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
