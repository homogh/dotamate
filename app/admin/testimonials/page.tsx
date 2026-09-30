"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, XCircle } from "lucide-react";

import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { useConfirm } from "@/app/stores/useConfirm";
import { TESTIMONIAL_STATUS_LABEL } from "@/app/lib/testimonials";

interface AdminTestimonial {
  id: number;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  updatedAt: string;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  rankLabel: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[rgba(245,158,11,0.13)] border-[#f59e0b] text-[#f59e0b]",
  APPROVED: "bg-[rgba(34,197,94,0.14)] border-[#22c55e] text-[#22c55e]",
  REJECTED: "bg-[rgba(239,68,68,0.13)] border-[#ef4444] text-[#ef4444]",
};

const FILTERS = [
  { value: "PENDING", label: "در انتظار تایید" },
  { value: "APPROVED", label: "تایید شده" },
  { value: "REJECTED", label: "رد شده" },
  { value: "", label: "همه" },
];

export default function AdminTestimonialsPage() {
  const confirmAction = useConfirm();
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return fetch(`/api/admin/testimonials?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setItems(json.data.testimonials);
          setCounts(json.data.counts);
        }
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: number, next: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") await load();
    else setError(json.message ?? "خطایی پیش اومد.");
  }

  async function remove(id: number) {
    if (!(await confirmAction({ message: "مطمئنی می‌خوای این نظر رو حذف کنی؟", danger: true, confirmLabel: "حذف" }))) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") await load();
    else setError(json.message ?? "خطایی پیش اومد.");
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Clock} label="در انتظار تایید" value={counts.pending} />
        <KpiCard icon={CheckCircle} label="تایید شده (نمایش در صفحه اصلی)" value={counts.approved} />
        <KpiCard icon={XCircle} label="رد شده" value={counts.rejected} />
      </div>

      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center gap-3 p-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-[8px] px-4 py-2 text-[13px] ${
              status === f.value ? "bg-primary font-bold text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            {f.label}
          </button>
        ))}
      </Card>

      {error && (
        <p className="text-sm text-red-400" dir="auto">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : items.length === 0 ? (
        <Card tone="surface" noHover className="w-full items-center p-8 text-center text-[13px] text-text-dim">
          نظری در این وضعیت نیست.
        </Card>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {items.map((t) => (
            <Card key={t.id} tone="surface" noHover className="w-full gap-4 p-5">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <span className={`rounded-[4px] border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[t.status]}`} dir="auto">
                  {TESTIMONIAL_STATUS_LABEL[t.status]}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    <Link href={`/admin/users/${t.userId}`} className="text-[14px] font-black text-text hover:underline" dir="auto">
                      {t.userName}
                    </Link>
                    <p className="text-[11px] text-text-dim" dir="auto">
                      {t.rankLabel ? `${t.rankLabel} · ` : ""}
                      {new Date(t.updatedAt).toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <UserAvatar name={t.userName} avatarUrl={t.avatarUrl} size={40} />
                </div>
              </div>

              <p className="w-full text-right text-[14px] leading-[1.8] text-text" dir="auto">
                {t.body}
              </p>

              <div className="flex w-full flex-wrap items-center justify-start gap-2">
                {t.status !== "APPROVED" && (
                  <button
                    disabled={busyId === t.id}
                    onClick={() => review(t.id, "APPROVED")}
                    className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    تایید و نمایش
                  </button>
                )}
                {t.status !== "REJECTED" && (
                  <button
                    disabled={busyId === t.id}
                    onClick={() => review(t.id, "REJECTED")}
                    className="rounded-[6px] border border-border px-4 py-2 text-[13px] text-text-dim disabled:opacity-50"
                  >
                    رد کردن
                  </button>
                )}
                <button
                  disabled={busyId === t.id}
                  onClick={() => remove(t.id)}
                  className="rounded-[6px] border border-[#ef4444]/40 px-4 py-2 text-[13px] text-[#ef4444] disabled:opacity-50"
                >
                  حذف
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) {
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
      <p className="w-full text-right text-[24px] font-black text-text">{value.toLocaleString("fa-IR")}</p>
    </div>
  );
}
