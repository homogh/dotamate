"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";

interface GiftProduct {
  id: number;
  type: "GIFT_CARD" | "ITEM";
  title: string;
  active: boolean;
  availableCodes: number;
  waitingOrders: number;
}

interface GiftCodeRow {
  id: number;
  codeHint: string;
  status: "AVAILABLE" | "ASSIGNED" | "VOID";
  orderId: number | null;
  assignedAt: string | null;
  createdAt: string;
  addedByName: string;
}

const STATUS: Record<GiftCodeRow["status"], { label: string; className: string }> = {
  AVAILABLE: { label: "آماده فروش", className: "border-success/30 text-success" },
  ASSIGNED: { label: "فروخته شده", className: "border-primary/40 text-accent" },
  VOID: { label: "باطل شده", className: "border-border text-text-dim" },
};

export default function AdminGiftCodesPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [products, setProducts] = useState<GiftProduct[]>([]);
  const [lowStock, setLowStock] = useState(3);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [codes, setCodes] = useState<GiftCodeRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(() => {
    return fetch("/api/admin/shop/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        const giftCards = (json.data.products as GiftProduct[]).filter((p) => p.type === "GIFT_CARD");
        setProducts(giftCards);
        setLowStock(json.data.lowStockThreshold);
        setSelectedId((current) => {
          if (current) return current;
          const fromUrl = Number(new URLSearchParams(window.location.search).get("productId"));
          return giftCards.find((p) => p.id === fromUrl)?.id ?? giftCards[0]?.id ?? null;
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const loadCodes = useCallback((productId: number) => {
    return fetch(`/api/admin/shop/gift-codes?productId=${productId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setCodes(json.data);
      });
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (selectedId) loadCodes(selectedId);
  }, [selectedId, loadCodes]);

  const lineCount = draft.split(/\r?\n/).filter((line) => line.trim()).length;

  async function handleAdd() {
    if (!selectedId || lineCount === 0) return;
    setSaving(true);
    const res = await fetch("/api/admin/shop/gift-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedId, codes: draft }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status === "success") {
      toast.success(json.message);
      setDraft("");
      loadProducts();
      loadCodes(selectedId);
    } else {
      toast.error(json.message);
    }
  }

  async function handleVoid(code: GiftCodeRow) {
    if (!(await confirmAction({ message: `کد «…${code.codeHint}» باطل شود؟ این کار برگشت‌پذیر نیست.`, danger: true, confirmLabel: "ابطال" }))) return;
    const res = await fetch(`/api/admin/shop/gift-codes/${code.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    loadProducts();
    if (selectedId) loadCodes(selectedId);
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="flex w-full p-6 md:p-8">
        <Card tone="surface" noHover className="w-full items-center p-8">
          <p className="text-[14px] text-text-dim" dir="auto">
            هنوز محصول گیفت کارتی تعریف نشده. اول از بخش «محصولات فروشگاه» یک گیفت کارت بساز.
          </p>
        </Card>
      </div>
    );
  }

  const selected = products.find((p) => p.id === selectedId);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((p) => {
          const low = p.availableCodes <= lowStock;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`flex flex-col items-end gap-2 rounded-[12px] border p-4 text-right transition-colors ${
                p.id === selectedId ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-white/20"
              }`}
            >
              <p className="text-[14px] font-black text-text" dir="auto">
                {p.title}
              </p>
              <p className={`text-[22px] font-black ${low ? "text-danger" : "text-success"}`}>{p.availableCodes.toLocaleString("fa-IR")}</p>
              <p className="text-[11px] text-text-dim" dir="auto">
                کد آماده فروش
                {p.waitingOrders > 0 && ` · ${p.waitingOrders.toLocaleString("fa-IR")} سفارش منتظر کد`}
                {!p.active && " · محصول غیرفعال"}
              </p>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              افزودن کد به «{selected.title}»
            </p>
            <p className="w-full text-right text-[12px] leading-[1.7] text-text-dim" dir="auto">
              هر کد را در یک خط بنویس یا لیست را paste کن. کدهای تکراری خودکار رد می‌شوند. اگر سفارشی منتظر کد باشد، به ترتیب زمان خرید همین حالا تحویل داده می‌شود.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              dir="ltr"
              spellCheck={false}
              placeholder={"XXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX"}
              className="w-full resize-y rounded-[8px] border border-border bg-surface-alt p-4 font-mono text-[13px] text-text focus:outline-none"
            />
            <div className="flex w-full items-center justify-between">
              <button
                disabled={saving || lineCount === 0}
                onClick={handleAdd}
                className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                dir="auto"
              >
                {saving ? "در حال ثبت..." : `ثبت ${lineCount.toLocaleString("fa-IR")} کد`}
              </button>
              <p className="text-[12px] text-text-dim" dir="auto">
                کدها رمزنگاری‌شده ذخیره می‌شوند و فقط به خریدار نمایش داده می‌شوند.
              </p>
            </div>
          </Card>

          <Card tone="surface" noHover className="w-full gap-3 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              کدهای ثبت‌شده
            </p>
            {codes.length === 0 ? (
              <p className="w-full py-4 text-center text-[12px] text-text-dim" dir="auto">
                هنوز کدی برای این محصول ثبت نشده.
              </p>
            ) : (
              codes.map((code) => (
                <div key={code.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] bg-surface-alt p-3 text-[12px]">
                  <div className="flex items-center gap-2">
                    {code.status === "AVAILABLE" && (
                      <button
                        onClick={() => handleVoid(code)}
                        className="whitespace-nowrap rounded-[6px] border border-danger/30 px-2.5 py-1 font-bold text-danger"
                      >
                        ابطال
                      </button>
                    )}
                    <span className={`whitespace-nowrap rounded-[6px] border px-2.5 py-1 font-bold ${STATUS[code.status].className}`}>
                      {STATUS[code.status].label}
                      {code.orderId && ` · سفارش #${code.orderId}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-text-dim" dir="auto">
                      {new Date(code.createdAt).toLocaleString("fa-IR")} · {code.addedByName}
                    </p>
                    <p className="font-mono font-bold text-text" dir="ltr">
                      •••••{code.codeHint}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
