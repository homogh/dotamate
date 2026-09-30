"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";

interface AttachmentRow {
  id: number;
  kind: string;
  uploaderId: number;
  uploaderName: string;
  isBuyer: boolean;
  createdAt: string;
  url: string;
}

interface MarketOrderRow {
  id: number;
  status: string;
  tradeMode: "DIRECT" | "ESCROW";
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
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  mutualConfirmDeadlineAt: string | null;
  adminReceivedAt: string | null;
  adminTradeUrl: string | null;
  disputeReason: string | null;
  resolutionNote: string | null;
  attachments: AttachmentRow[];
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
  AWAITING_ADMIN: "در انتظار پذیرش ادمین",
  AWAITING_SELLER: "در جریان ترید",
  SELLER_SENT: "ارسال‌شده به ادمین؛ منتظر تأیید دریافت",
  ADMIN_RECEIVED: "دریافت‌شده توسط ادمین؛ در حال تحویل به خریدار",
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

  async function accept(order: MarketOrderRow, adminTradeUrl: string) {
    const res = await fetch(`/api/admin/shop/market/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", adminTradeUrl }),
    });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  async function receive(order: MarketOrderRow) {
    if (!(await confirmAction({ message: `تأیید می‌کنی آیتم «${order.itemName}» از فروشنده به اکانت استیم ادمین رسیده؟`, confirmLabel: "بله، دریافت شد" }))) return;
    const res = await fetch(`/api/admin/shop/market/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive" }),
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
          [...orders]
            .sort((a, b) => Number(b.status === "AWAITING_ADMIN") - Number(a.status === "AWAITING_ADMIN"))
            .map((o) => {
            const open = ["DISPUTED", "AWAITING_SELLER", "SELLER_SENT", "ADMIN_RECEIVED"].includes(o.status);
            return (
              <div
                key={o.id}
                className={cn(
                  "flex w-full flex-col gap-3 rounded-[8px] border bg-surface-alt p-4",
                  o.status === "DISPUTED" ? "border-danger/40" : o.status === "AWAITING_ADMIN" ? "border-primary/50" : "border-border",
                )}
              >
                {o.tradeMode === "ESCROW" && o.status === "AWAITING_ADMIN" && <AcceptOrderForm onAccept={(url) => accept(o, url)} />}
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    {o.tradeMode === "ESCROW" && o.status === "SELLER_SENT" && (
                      <button onClick={() => receive(o)} className="rounded-[6px] bg-primary px-2.5 py-1.5 font-bold text-white">
                        تأیید دریافت از فروشنده
                      </button>
                    )}
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
                    <span className="rounded-[6px] border border-accent/30 px-2.5 py-1 font-bold text-accent">{o.tradeMode === "DIRECT" ? "ترید مستقیم" : "واسطه‌گری دوتامیت"}</span>
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

                {o.disputeReason && <p className="rounded-[6px] bg-danger/10 px-3 py-2 text-right text-[12px] leading-[1.8] text-danger">دلیل اعتراض: {o.disputeReason}</p>}
                {o.resolutionNote && !open && <p className="text-right text-[12px] text-text-dim">نتیجه: {o.resolutionNote}</p>}

                {o.tradeMode === "DIRECT" && (
                  <div className="flex w-full gap-4 text-[11px] text-text-dim">
                    <span className={o.sellerConfirmedAt ? "font-bold text-success" : ""}>تأیید فروشنده: {o.sellerConfirmedAt ? fmt(o.sellerConfirmedAt) : "هنوز نه"}</span>
                    <span className={o.buyerConfirmedAt ? "font-bold text-success" : ""}>تأیید خریدار: {o.buyerConfirmedAt ? fmt(o.buyerConfirmedAt) : "هنوز نه"}</span>
                  </div>
                )}

                {o.attachments.length > 0 && (
                  <div className="flex w-full flex-col gap-2">
                    <p className="text-right text-[11px] font-bold text-text-dim">مدارک پیوست‌شده ({o.attachments.length.toLocaleString("fa-IR")})</p>
                    <div className="flex flex-wrap gap-2">
                      {o.attachments.map((a) => (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="rounded-[6px] border border-border bg-surface px-2.5 py-1.5 text-[11px] text-accent hover:underline">
                          {a.kind === "VIDEO" ? "ویدیو" : "عکس"} از {a.isBuyer ? "خریدار" : "فروشنده"} ({a.uploaderName})
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid w-full gap-2 text-[11px] text-text-dim sm:grid-cols-4">
                  <span>پرداخت: {fmt(o.paidAt)}</span>
                  <span>مهلت ارسال: {fmt(o.sellerDeadlineAt)}</span>
                  <span>ارسال: {fmt(o.sentAt)}</span>
                  <span>دریافت ادمین: {fmt(o.adminReceivedAt)}</span>
                </div>
                <p className="truncate text-left font-mono text-[11px] text-text-dim" dir="ltr">
                  asset {o.assetId} → {o.buyerTradeUrl}
                </p>
                {o.adminTradeUrl && (
                  <p className="truncate text-left font-mono text-[11px] text-text-dim" dir="ltr">
                    seller → admin: {o.adminTradeUrl}
                  </p>
                )}
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

/** ESCROW order waiting for an admin to accept it and hand over their own Steam trade link. */
function AcceptOrderForm({ onAccept }: { onAccept: (adminTradeUrl: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-[8px] border border-primary/40 bg-primary/10 p-3">
      <span className="text-[12px] font-bold text-primary">این سفارش منتظر پذیرش است — لینک ترید استیم خودت را وارد کن:</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://steamcommunity.com/tradeoffer/new/?..."
        dir="ltr"
        className="h-9 min-w-[220px] flex-1 rounded-[6px] border border-border bg-surface px-3 text-[12px] text-text focus:border-primary focus:outline-none"
      />
      <button
        disabled={!url.trim()}
        onClick={() => onAccept(url.trim())}
        className="rounded-[6px] bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
      >
        پذیرش سفارش
      </button>
    </div>
  );
}
