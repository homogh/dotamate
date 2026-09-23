"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";

interface Payout {
  id: number;
  userId: number;
  userName: string;
  amountToman: number;
  sheba: string;
  holderName: string;
  status: "PENDING" | "PAID" | "REJECTED";
  trackingRef: string | null;
  adminNote: string | null;
  processedByName: string | null;
  processedAt: string | null;
  createdAt: string;
}

const TABS = [
  { value: "PENDING", label: "در انتظار واریز" },
  { value: "PAID", label: "واریز شده" },
  { value: "REJECTED", label: "رد شده" },
];

export default function AdminPayoutsPage() {
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const [data, setData] = useState<{ pendingCount: number; pendingTotal: number; requests: Payout[] } | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/admin/shop/payouts?status=${status}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      });
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(p: Payout, action: "paid" | "reject") {
    const input =
      action === "paid"
        ? prompt(`کد پیگیری واریز ${p.amountToman.toLocaleString("fa-IR")} تومان به ${p.holderName}:`)
        : prompt("دلیل رد درخواست (به کاربر نمایش داده می‌شود):", "مشخصات حساب با نام کاربر مطابقت ندارد.");
    if (input === null) return;

    const res = await fetch(`/api/admin/shop/payouts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "paid" ? { action, trackingRef: input } : { action, note: input }),
    });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text).catch(() => null);
    toast.success("کپی شد.");
  }

  if (!data) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <div className={cn("flex flex-col items-end gap-1 rounded-[12px] border p-4", data.pendingCount > 0 ? "border-[#f59e0b]/60 bg-[#f59e0b]/[0.08]" : "border-border bg-surface")}>
          <p className={cn("text-[22px] font-black", data.pendingCount > 0 ? "text-[#f59e0b]" : "text-text")}>{data.pendingCount.toLocaleString("fa-IR")}</p>
          <p className="text-[12px] text-text-dim">درخواست در انتظار</p>
        </div>
        <div className="flex flex-col items-end gap-1 rounded-[12px] border border-border bg-surface p-4">
          <p className="text-[22px] font-black text-text">{data.pendingTotal.toLocaleString("fa-IR")} تومان</p>
          <p className="text-[12px] text-text-dim">مجموع مبالغ در انتظار واریز</p>
        </div>
      </div>

      <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
        <div className="flex w-full gap-2 rounded-[10px] bg-surface-alt p-1.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={cn("flex-1 rounded-[8px] py-2 text-[13px] transition-colors", status === t.value ? "bg-primary font-bold text-white" : "text-text-dim hover:text-text")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {data.requests.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">درخواستی در این بخش نیست.</p>
        ) : (
          data.requests.map((p) => (
            <div key={p.id} className="flex w-full flex-col gap-3 rounded-[8px] border border-border bg-surface-alt p-4">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px]">
                  {p.status === "PENDING" ? (
                    <>
                      <button onClick={() => act(p, "paid")} className="rounded-[6px] bg-success px-2.5 py-1.5 font-bold text-white">
                        واریز شد
                      </button>
                      <button onClick={() => act(p, "reject")} className="rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger">
                        رد درخواست
                      </button>
                    </>
                  ) : (
                    <span className="text-text-dim">
                      {p.status === "PAID" ? `پیگیری: ${p.trackingRef}` : `دلیل: ${p.adminNote}`} · {p.processedByName} · {p.processedAt && new Date(p.processedAt).toLocaleString("fa-IR")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  <p className="text-[15px] font-black text-text">{p.amountToman.toLocaleString("fa-IR")} تومان</p>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text">
                      #{p.id} ·{" "}
                      <Link href={`/admin/users/${p.userId}`} className="text-accent hover:underline">
                        {p.userName}
                      </Link>
                    </p>
                    <p className="text-[11px] text-text-dim">{new Date(p.createdAt).toLocaleString("fa-IR")}</p>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[6px] bg-bg px-3 py-2">
                <button onClick={() => copy(p.sheba)} className="flex items-center gap-2 font-mono text-[13px] text-accent" dir="ltr">
                  <Copy size={13} />
                  {p.sheba}
                </button>
                <span className="text-[13px] text-text">صاحب حساب: {p.holderName}</span>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
