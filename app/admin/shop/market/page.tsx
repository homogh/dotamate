"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";

interface MarketOrderRow {
  id: number;
  status: string;
  itemName: string;
  listingId: number;
  assetId: string;
  buyerId: number;
  buyerName: string;
  sellerId: number;
  sellerName: string;
  priceToman: number;
  commissionToman: number;
  buyerTradeUrl: string;
  paidAt: string | null;
  sentAt: string | null;
  sellerDeadlineAt: string | null;
  autoCompleteAt: string | null;
  disputeReason: string | null;
  resolutionNote: string | null;
}

interface ListingRow {
  id: number;
  itemName: string;
  priceToman: number;
  sellerId: number;
  sellerName: string;
  createdAt: string;
}

interface Summary {
  disputes: number;
  active: number;
  activeListings: number;
  completedVolume: number;
  commissionEarned: number;
}

const TABS = [
  { value: "disputes", label: "اعتراض‌ها" },
  { value: "active", label: "سفارش‌های در جریان" },
  { value: "done", label: "بسته‌شده" },
  { value: "listings", label: "آگهی‌های فعال" },
];

const STATUS_LABELS: Record<string, string> = {
  AWAITING_SELLER: "منتظر ارسال فروشنده",
  SELLER_SENT: "ارسال شده؛ منتظر خریدار",
  DISPUTED: "اعتراض",
  COMPLETED: "تکمیل شده",
  REFUNDED: "بازگشت وجه",
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("fa-IR") : "—");

export default function AdminMarketPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState("disputes");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<MarketOrderRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);

  const load = useCallback(() => {
    return fetch(`/api/admin/shop/market?tab=${tab}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        setSummary(json.data.summary);
        setOrders(json.data.orders ?? []);
        setListings(json.data.listings ?? []);
      });
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(order: MarketOrderRow, action: "release" | "refund") {
    const question =
      action === "release"
        ? `مبلغ ${(order.priceToman - order.commissionToman).toLocaleString("fa-IR")} تومان به ${order.sellerName} (فروشنده) پرداخت شود؟`
        : `کل مبلغ ${order.priceToman.toLocaleString("fa-IR")} تومان به ${order.buyerName} (خریدار) برگردد؟`;
    if (!(await confirmAction({ message: question, danger: action === "refund", confirmLabel: action === "release" ? "پرداخت به فروشنده" : "بازگشت به خریدار" }))) return;
    const note = prompt("توضیح تصمیم (به هر دو طرف نمایش داده می‌شود):", "") ?? "";

    const res = await fetch(`/api/admin/shop/market/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  async function removeListing(listing: ListingRow) {
    const reason = prompt(`دلیل حذف آگهی «${listing.itemName}» (به فروشنده نمایش داده می‌شود):`, "مغایر با قوانین بازار");
    if (reason === null) return;
    const res = await fetch(`/api/admin/shop/market/listings/${listing.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  if (!summary) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="اعتراض‌های باز" value={summary.disputes.toLocaleString("fa-IR")} highlight={summary.disputes > 0} />
        <Stat label="سفارش‌های در جریان" value={summary.active.toLocaleString("fa-IR")} />
        <Stat label="حجم فروش تکمیل‌شده" value={`${summary.completedVolume.toLocaleString("fa-IR")} تومان`} />
        <Stat label="درآمد کمیسیون" value={`${summary.commissionEarned.toLocaleString("fa-IR")} تومان`} />
      </div>

      <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
        <div className="flex w-full gap-2 rounded-[10px] bg-surface-alt p-1.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn("flex-1 rounded-[8px] py-2 text-[13px] transition-colors", tab === t.value ? "bg-primary font-bold text-white" : "text-text-dim hover:text-text")}
            >
              {t.label}
              {t.value === "listings" && ` (${summary.activeListings.toLocaleString("fa-IR")})`}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          listings.length === 0 ? (
            <Empty />
          ) : (
            listings.map((l) => (
              <div key={l.id} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <button onClick={() => removeListing(l)} className="rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger">
                    حذف آگهی
                  </button>
                  <a href={`/shop/market/${l.id}`} target="_blank" rel="noreferrer" className="px-1.5 text-text-dim hover:text-text" aria-label="مشاهده">
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div className="flex items-center gap-5">
                  <p className="text-[13px] font-bold text-text">{l.priceToman.toLocaleString("fa-IR")} تومان</p>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {l.itemName}
                    </p>
                    <p className="text-[11px] text-text-dim">
                      <Link href={`/admin/users/${l.sellerId}`} className="text-accent hover:underline">
                        {l.sellerName}
                      </Link>{" "}
                      · {fmt(l.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        ) : orders.length === 0 ? (
          <Empty />
        ) : (
          orders.map((o) => {
            const open = ["DISPUTED", "AWAITING_SELLER", "SELLER_SENT"].includes(o.status);
            return (
              <div key={o.id} className={cn("flex w-full flex-col gap-3 rounded-[8px] border bg-surface-alt p-4", o.status === "DISPUTED" ? "border-danger/40" : "border-border")}>
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    {open && (
                      <>
                        <button onClick={() => resolve(o, "release")} className="rounded-[6px] bg-success px-2.5 py-1.5 font-bold text-white">
                          پرداخت به فروشنده
                        </button>
                        <button onClick={() => resolve(o, "refund")} className="rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger">
                          بازگشت به خریدار
                        </button>
                      </>
                    )}
                    <span className="rounded-[6px] border border-border px-2.5 py-1 font-bold text-text-dim">{STATUS_LABELS[o.status] ?? o.status}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-end">
                      <p className="text-[13px] font-bold text-text">{o.priceToman.toLocaleString("fa-IR")} تومان</p>
                      <p className="text-[11px] text-text-dim">کمیسیون {o.commissionToman.toLocaleString("fa-IR")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="text-[14px] font-black text-text" dir="auto">
                        #{o.id} · {o.itemName}
                      </p>
                      <p className="text-[11px] text-text-dim">
                        فروشنده:{" "}
                        <Link href={`/admin/users/${o.sellerId}`} className="text-accent hover:underline">
                          {o.sellerName}
                        </Link>{" "}
                        · خریدار:{" "}
                        <Link href={`/admin/users/${o.buyerId}`} className="text-accent hover:underline">
                          {o.buyerName}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                {o.disputeReason && <p className="rounded-[6px] bg-danger/10 px-3 py-2 text-right text-[12px] leading-[1.8] text-danger">اعتراض خریدار: {o.disputeReason}</p>}
                {o.resolutionNote && !open && <p className="text-right text-[12px] text-text-dim">نتیجه: {o.resolutionNote}</p>}

                <div className="grid w-full gap-2 text-[11px] text-text-dim sm:grid-cols-4">
                  <span>پرداخت: {fmt(o.paidAt)}</span>
                  <span>مهلت ارسال: {fmt(o.sellerDeadlineAt)}</span>
                  <span>ارسال: {fmt(o.sentAt)}</span>
                  <span>تأیید خودکار: {fmt(o.autoCompleteAt)}</span>
                </div>
                <p className="truncate text-left font-mono text-[11px] text-text-dim" dir="ltr">
                  asset {o.assetId} → {o.buyerTradeUrl}
                </p>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-col items-end gap-1 rounded-[12px] border p-4", highlight ? "border-danger/50 bg-danger/[0.08]" : "border-border bg-surface")}>
      <p className={cn("text-[20px] font-black", highlight ? "text-danger" : "text-text")}>{value}</p>
      <p className="text-[12px] text-text-dim">{label}</p>
    </div>
  );
}

function Empty() {
  return <p className="w-full py-8 text-center text-[13px] text-text-dim">موردی در این بخش نیست.</p>;
}
