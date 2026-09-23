"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { productHref } from "@/app/lib/shopCategories";
import { cn } from "@/app/lib/utils";
import { Card } from "@/components/general/card";
import { Input } from "@/components/ui/input";

type ProductType = "GIFT_CARD" | "ITEM";

interface Product {
  id: number;
  type: ProductType;
  title: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  priceUsdCents: number;
  stock: number | null;
  active: boolean;
  priceToman: number | null;
  availableCodes: number;
  waitingOrders: number;
}

const TYPE_LABELS: Record<ProductType, string> = { GIFT_CARD: "گیفت کارت", ITEM: "آیتم دوتا ۲" };
const FILTERS: { value: ProductType | "ALL"; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "GIFT_CARD", label: "گیفت کارت" },
  { value: "ITEM", label: "آیتم دوتا ۲" },
];

export default function AdminShopProductsPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState(3);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductType | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    return fetch("/api/admin/shop/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setProducts(json.data.products);
          setLowStock(json.data.lowStockThreshold);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(p: Product) {
    await fetch(`/api/admin/shop/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  async function handleDelete(p: Product) {
    if (!(await confirmAction({ message: `محصول «${p.title}» حذف شود؟`, danger: true, confirmLabel: "حذف" }))) return;
    const res = await fetch(`/api/admin/shop/products/${p.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  const q = query.trim().toLowerCase();
  const visible = products.filter((p) => (filter === "ALL" || p.type === filter) && (!q || p.title.toLowerCase().includes(q)));

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <Link href="/admin/shop/products/new" className="whitespace-nowrap rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white">
            افزودن محصول جدید +
          </Link>
          <p className="text-[16px] font-black text-text">محصولات فروشگاه</p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-[280px]">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی عنوان..." className="h-10 pr-9" dir="auto" />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-[20px] px-4 py-1.5 text-[12px] font-bold transition-colors",
                  filter === f.value ? "bg-primary text-white" : "border border-border text-text-dim hover:text-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">{products.length === 0 ? "هنوز محصولی ثبت نشده." : "محصولی با این فیلتر پیدا نشد."}</p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {visible.map((p) => {
              const incomplete = !p.shortDescription || !p.description;
              return (
                <div key={p.id} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <button onClick={() => handleDelete(p)} className="whitespace-nowrap rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger">
                      حذف
                    </button>
                    <Link href={`/admin/shop/products/${p.id}`} className="whitespace-nowrap rounded-[6px] border border-border px-2.5 py-1.5 font-bold text-accent">
                      ویرایش
                    </Link>
                    <button
                      onClick={() => toggleActive(p)}
                      className={cn(
                        "whitespace-nowrap rounded-[6px] border px-2.5 py-1.5 font-bold",
                        p.active ? "border-success/30 text-success" : "border-border text-text-dim",
                      )}
                    >
                      {p.active ? "فعال" : "غیرفعال"}
                    </button>
                    <a href={productHref(p)} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-1.5 text-text-dim hover:text-text" aria-label="مشاهده در سایت">
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {incomplete && (
                      <span className="whitespace-nowrap rounded-[6px] bg-[#f59e0b]/[0.13] px-2.5 py-1 text-[11px] font-bold text-[#f59e0b]">توضیحات ناقص</span>
                    )}
                    {p.type === "ITEM" ? (
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-[6px] px-2.5 py-1 text-[12px] font-bold",
                          p.stock !== null && p.stock <= 0 ? "bg-danger/15 text-danger" : "bg-surface text-text-dim",
                        )}
                      >
                        {p.stock === null ? "موجودی نامحدود" : `${p.stock.toLocaleString("fa-IR")} عدد موجود`}
                      </span>
                    ) : (
                      <Link
                        href={`/admin/shop/gift-codes?productId=${p.id}`}
                        className={cn(
                          "whitespace-nowrap rounded-[6px] px-2.5 py-1 text-[12px] font-bold",
                          p.availableCodes <= lowStock ? "bg-danger/15 text-danger" : "bg-success/10 text-success",
                        )}
                      >
                        {p.availableCodes.toLocaleString("fa-IR")} کد موجود
                        {p.waitingOrders > 0 && ` · ${p.waitingOrders.toLocaleString("fa-IR")} سفارش منتظر`}
                      </Link>
                    )}
                    <div className="flex flex-col items-end">
                      <p className="text-[13px] font-bold text-text">{p.priceToman === null ? "بدون قیمت" : `${p.priceToman.toLocaleString("fa-IR")} تومان`}</p>
                      <p className="text-[11px] text-text-dim" dir="ltr">
                        ${(p.priceUsdCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="max-w-[260px] truncate text-[14px] font-black text-text">{p.title}</p>
                      <p className="text-[11px] text-text-dim">{TYPE_LABELS[p.type]}</p>
                    </div>
                    <div className="w-[72px] shrink-0 overflow-hidden rounded-[6px]">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="aspect-[1.6] w-full bg-surface object-contain" />
                      ) : p.type === "GIFT_CARD" ? (
                        <div className="flex aspect-[1.6] w-full items-center justify-center bg-gradient-to-br from-[#1b9ad6] to-[#0b2a45] text-[13px] font-black text-white" dir="ltr">
                          ${p.priceUsdCents / 100}
                        </div>
                      ) : (
                        <div className="aspect-[1.6] w-full bg-surface" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
