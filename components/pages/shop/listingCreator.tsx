"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";

interface InventoryItem {
  assetId: string;
  name: string;
  type: string | null;
  imageUrl: string | null;
  rarityColor: string | null;
  heroName: string | null;
  tradable: boolean;
  alreadyListed: boolean;
}

interface Props {
  commissionPercent: number;
  minPrice: number;
  payoutHoldHours: number;
  sellerDeadlineHours: number;
}

export function ListingCreator({ commissionPercent, minPrice, payoutHoldHours, sellerDeadlineHours }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback((refresh: boolean) => {
    return fetch(`/api/shop/market/inventory${refresh ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setItems(json.data);
          setError(null);
        } else {
          setError(json.message);
        }
      })
      .catch(() => setError("ارتباط با سرور برقرار نشد."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInventory(false);
  }, [fetchInventory]);

  function reload() {
    setLoading(true);
    fetchInventory(true);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? [])
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.heroName?.toLowerCase().includes(q))
      .sort((a, b) => Number(b.tradable && !b.alreadyListed) - Number(a.tradable && !a.alreadyListed));
  }, [items, query]);

  const priceNum = Math.floor(Number(price) || 0);
  const commission = Math.round((priceNum * commissionPercent) / 100);
  const payout = priceNum - commission;

  async function submit() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/shop/market/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: selected.assetId, priceToman: priceNum, description }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (json?.status === "success") {
      toast.success(json.message);
      router.push("/dashboard/listings");
      router.refresh();
    } else {
      toast.error(json?.message ?? "ثبت آگهی ناموفق بود.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <Card tone="surface" noHover className="w-full flex-1 items-stretch gap-4 p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button onClick={reload} disabled={loading} className="flex items-center gap-1.5 text-[12px] font-bold text-text-dim hover:text-text disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            به‌روزرسانی اینونتوری
          </button>
          <p className="text-[16px] font-black text-text">۱. آیتم را از اینونتوری استیمت انتخاب کن</p>
        </div>

        {items && items.length > 0 && (
          <div className="relative w-full">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام آیتم یا هیرو..."
              className="h-10 w-full rounded-[8px] border border-border bg-surface-alt pr-9 text-[13px] text-text placeholder:text-text-dim focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {loading && !items ? (
          <div className="flex h-48 items-center justify-center gap-2 text-[13px] text-text-dim">
            <Loader2 size={16} className="animate-spin" />
            در حال خواندن اینونتوری از استیم...
          </div>
        ) : error ? (
          <p className="rounded-[8px] border border-danger/40 bg-danger/10 px-4 py-3 text-right text-[13px] leading-[1.8] text-danger">{error}</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-text-dim">{items?.length ? "آیتمی با این جستجو پیدا نشد." : "اینونتوری دوتای تو خالی است."}</p>
        ) : (
          <div className="grid max-h-[560px] w-full grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const disabled = !item.tradable || item.alreadyListed;
              return (
                <button
                  key={item.assetId}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(item)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-[10px] border bg-surface-alt p-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    selected?.assetId === item.assetId ? "border-primary bg-primary/10" : "border-border hover:border-white/20",
                  )}
                  style={item.rarityColor ? { borderBottomColor: item.rarityColor, borderBottomWidth: 3 } : undefined}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" loading="lazy" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-16 rounded bg-surface" />
                  )}
                  <span className="line-clamp-2 text-[12px] font-bold leading-[1.5] text-text" dir="ltr">
                    {item.name}
                  </span>
                  {disabled && <span className="text-[10px] text-text-dim">{item.alreadyListed ? "در بازار است" : "قابل ترید نیست"}</span>}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6 lg:w-[360px] lg:shrink-0">
        <p className="text-right text-[16px] font-black text-text">۲. قیمت و توضیحات</p>
        {selected ? (
          <>
            <div className="flex items-center gap-3 rounded-[8px] bg-surface-alt p-3">
              {selected.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.imageUrl} alt="" className="h-12 w-auto" />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-bold text-text" dir="ltr">
                  {selected.name}
                </span>
                {selected.heroName && <span className="text-[11px] text-text-dim">{selected.heroName}</span>}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-right text-[13px] font-bold text-text">قیمت فروش (تومان)</span>
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={minPrice.toLocaleString("en-US")}
                dir="ltr"
                className="h-11 rounded-[8px] border border-border bg-surface-alt px-4 text-left text-[14px] text-text focus:border-primary focus:outline-none"
              />
            </label>

            {priceNum > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[8px] border border-border p-3 text-[13px]">
                <Row label="قیمت برای خریدار" value={priceNum} />
                <Row label={`کمیسیون دوتامیت (${commissionPercent.toLocaleString("fa-IR")}٪)`} value={-commission} />
                <div className="border-t border-border pt-1.5">
                  <Row label="سهم تو (به میت کیف)" value={payout} strong />
                </div>
              </div>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-right text-[13px] font-bold text-text">توضیحات (اختیاری)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="مثلاً: استایل‌های باز شده، جم‌ها و ..."
                className="resize-none rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text focus:border-primary focus:outline-none"
              />
            </label>

            <button
              onClick={submit}
              disabled={saving || priceNum < minPrice}
              className="rounded-[8px] bg-primary px-4 py-3 text-[14px] font-black text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "در حال ثبت..." : "ثبت آگهی"}
            </button>
            <p className="text-right text-[11px] leading-[1.8] text-text-dim">
              بعد از فروش، {sellerDeadlineHours.toLocaleString("fa-IR")} ساعت فرصت داری آیتم را برای خریدار ترید کنی. پول بعد از تأیید خریدار به میت کیف تو واریز می‌شود و {payoutHoldHours.toLocaleString("fa-IR")} ساعت بعد قابل برداشت است.
            </p>
          </>
        ) : (
          <p className="py-8 text-center text-[13px] text-text-dim">اول یک آیتم از اینونتوری انتخاب کن.</p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex w-full items-center justify-between", strong ? "font-black text-success" : "text-text-dim")}>
      <span dir="ltr">
        {value < 0 ? "−" : ""}
        {Math.abs(value).toLocaleString("fa-IR")}
      </span>
      <span>{label}</span>
    </div>
  );
}
