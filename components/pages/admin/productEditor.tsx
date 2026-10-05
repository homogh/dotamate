"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/app/stores/useToast";
import { cn } from "@/app/lib/utils";

// Same rules as the server's slugify, so the preview matches what gets saved.
function slugifyClient(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

interface Pricing {
  usdCostToman: number;
  giftCardMarginPercent: number;
}

function computeTomanPrice(priceUsd: string, pricing: Pricing | null) {
  const usd = Number(priceUsd);
  if (!pricing || !(pricing.usdCostToman > 0) || !(usd > 0)) return null;
  const raw = usd * pricing.usdCostToman * (1 + pricing.giftCardMarginPercent / 100);
  return Math.ceil(raw / 1000) * 1000;
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/shop/upload", { method: "POST", body: form });
  const json = await res.json();
  if (json.status !== "success") throw new Error(json.message ?? "آپلود ناموفق بود.");
  return json.data.url as string;
}

interface EditorState {
  title: string;
  slug: string;
  priceUsd: string;
  shortDescription: string;
  description: string;
  features: string;
  imageUrl: string;
  imageAlt: string;
  metaTitle: string;
  metaDescription: string;
  active: boolean;
}

const EMPTY_STATE: EditorState = {
  title: "",
  slug: "",
  priceUsd: "",
  shortDescription: "",
  description: "",
  features: "",
  imageUrl: "",
  imageAlt: "",
  metaTitle: "",
  metaDescription: "",
  active: true,
};

export function ProductEditor({ productId }: { productId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = productId !== undefined;

  const [loading, setLoading] = useState(isEdit);
  const [state, setState] = useState<EditorState>(EMPTY_STATE);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/shop/products/${productId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        const p = json.data;
        setState({
          title: p.title,
          slug: p.slug ?? "",
          priceUsd: String(p.priceUsdCents / 100),
          shortDescription: p.shortDescription ?? "",
          description: p.description ?? "",
          features: p.features ?? "",
          imageUrl: p.imageUrl ?? "",
          imageAlt: p.imageAlt ?? "",
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          active: p.active,
        });
      })
      .finally(() => setLoading(false));
  }, [isEdit, productId]);

  useEffect(() => {
    fetch("/api/admin/shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setPricing(json.data.settings);
      })
      .catch(() => undefined);
  }, []);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setState((s) => ({ ...s, [key]: value }));

  function updateTitle(title: string) {
    setState((s) => ({ ...s, title, slug: slugTouched ? s.slug : slugifyClient(title) }));
  }

  async function handleImagePick(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setState((s) => ({ ...s, imageUrl: url, imageAlt: s.imageAlt || s.title }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(isEdit ? `/api/admin/shop/products/${productId}` : "/api/admin/shop/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status !== "success") {
      toast.error(json.message ?? "ذخیره ناموفق بود.");
      return;
    }
    toast.success(isEdit ? "تغییرات ذخیره شد." : "گیفت کارت اضافه شد.");
    router.push("/admin/shop/products");
    router.refresh();
  }

  if (loading) {
    return (
      <Card tone="surface" noHover className="w-full items-stretch gap-4 p-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  const tomanPrice = computeTomanPrice(state.priceUsd, pricing);
  const seoTitle = state.metaTitle || (state.title ? `خرید ${state.title} | فروشگاه دوتامیت` : "");
  const seoDescription = state.metaDescription || state.shortDescription;
  const checklist = [
    { ok: state.title.length >= 10, text: "عنوان حداقل ۱۰ حرف دارد" },
    { ok: state.shortDescription.length >= 50, text: "توضیح کوتاه حداقل ۵۰ حرف دارد" },
    { ok: state.description.length >= 300, text: "توضیحات کامل حداقل ۳۰۰ حرف دارد" },
    { ok: seoTitle.length > 0 && seoTitle.length <= 60, text: "عنوان سئو حداکثر ۶۰ حرف است" },
    { ok: seoDescription.length >= 70 && seoDescription.length <= 160, text: "توضیحات متا بین ۷۰ تا ۱۶۰ حرف است" },
    ...(state.imageUrl ? [{ ok: state.imageAlt.length > 0, text: "تصویر متن جایگزین (alt) دارد" }] : []),
  ];
  const passed = checklist.filter((c) => c.ok).length;

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImagePick(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-1 flex-col gap-6">
        <Card tone="surface" noHover className="w-full items-stretch gap-5 p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-title">عنوان گیفت کارت</Label>
            <Input id="p-title" value={state.title} onChange={(e) => updateTitle(e.target.value)} placeholder="مثلاً: گیفت کارت استیم ۱۰ دلاری" dir="auto" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="p-slug">نامک (Slug)</Label>
            <div className="flex w-full items-center gap-2">
              <Input
                id="p-slug"
                value={state.slug}
                onChange={(e) => set("slug", slugifyClient(e.target.value))}
                disabled={!slugTouched}
                dir="ltr"
                className="flex-1 disabled:opacity-70"
              />
              {!slugTouched && (
                <Button type="button" variant="outline" size="sm" onClick={() => setSlugTouched(true)}>
                  ویرایش
                </Button>
              )}
            </div>
            <p className="text-[11px] text-text-dim" dir="ltr">
              /shop/product/{state.slug || "..."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] text-text-dim" dir="ltr">
                {state.shortDescription.length}/300
              </span>
              <Label htmlFor="p-short">توضیح کوتاه</Label>
            </div>
            <Textarea
              id="p-short"
              value={state.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="یک یا دو جمله که کنار قیمت نمایش داده می‌شود و در گوگل هم استفاده می‌شود."
              className="min-h-20 bg-surface-alt"
              dir="auto"
            />
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full items-stretch gap-5 p-6">
          <p className="w-full text-right text-[16px] font-black text-text">درباره گیفت کارت</p>
          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] text-text-dim">{state.description.length.toLocaleString("fa-IR")} حرف</span>
              <Label htmlFor="p-desc">توضیحات کامل</Label>
            </div>
            <Textarea id="p-desc" value={state.description} onChange={(e) => set("description", e.target.value)} className="min-h-64 bg-surface-alt leading-[1.9]" dir="auto" />
            <p className="text-right text-[11px] leading-[1.8] text-text-dim">
              بین پاراگراف‌ها یک خط خالی بگذار. خطی که با <span dir="ltr">##</span> شروع شود تیتر می‌شود و خط‌هایی که با <span dir="ltr">-</span> شروع شوند لیست.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="p-features">ویژگی‌ها (هر خط یک ویژگی)</Label>
            <Textarea
              id="p-features"
              value={state.features}
              onChange={(e) => set("features", e.target.value)}
              placeholder={"تحویل آنی\nریجن آمریکا (USD)"}
              className="min-h-28 bg-surface-alt"
              dir="auto"
            />
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full items-stretch gap-5 p-6">
          <p className="w-full text-right text-[16px] font-black text-text">سئو (SEO)</p>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className={cn("text-[11px]", state.metaTitle.length > 60 ? "text-danger" : "text-text-dim")} dir="ltr">
                {state.metaTitle.length}/60
              </span>
              <Label htmlFor="p-meta-title">عنوان سئو (اختیاری)</Label>
            </div>
            <Input id="p-meta-title" value={state.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={seoTitle || "اگر خالی بماند از عنوان گیفت کارت ساخته می‌شود"} dir="auto" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className={cn("text-[11px]", state.metaDescription.length > 160 ? "text-danger" : "text-text-dim")} dir="ltr">
                {state.metaDescription.length}/160
              </span>
              <Label htmlFor="p-meta-desc">توضیحات متا (اختیاری)</Label>
            </div>
            <Textarea
              id="p-meta-desc"
              value={state.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
              placeholder={state.shortDescription || "اگر خالی بماند از توضیح کوتاه استفاده می‌شود"}
              className="min-h-20 bg-surface-alt"
              dir="auto"
            />
          </div>

          <div className="flex w-full flex-col gap-1.5 rounded-[8px] border border-border bg-surface-alt p-4">
            <p className="truncate text-right text-[13px] text-[#8ab4f8]">{seoTitle || "عنوان گیفت کارت"}</p>
            <p className="truncate text-left text-[12px] text-[#34a853]" dir="ltr">
              dotamate.ir/shop/product/{state.slug || "slug"}
            </p>
            <p className="line-clamp-2 text-right text-[12px] text-[#bdc1c6]">{seoDescription || "توضیحات گیفت کارت اینجا در نتایج گوگل نمایش داده می‌شود."}</p>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-[8px] border border-border p-4">
            <p className="text-right text-[13px] font-bold text-text">
              چک‌لیست سئو: {passed.toLocaleString("fa-IR")} از {checklist.length.toLocaleString("fa-IR")}
            </p>
            {checklist.map((c) => (
              <p key={c.text} className={cn("flex items-center gap-2 text-[12px]", c.ok ? "text-success" : "text-text-dim")}>
                {c.ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {c.text}
              </p>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
        <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
          <div className="flex w-full items-center justify-between">
            <Switch checked={state.active} onChange={(v) => set("active", v)} label={state.active ? "فعال" : "غیرفعال"} />
            <p className="text-[14px] font-black text-text">وضعیت</p>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving || uploading} className="w-full">
            {saving ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "افزودن گیفت کارت"}
          </Button>
        </Card>

        <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text">مبلغ و قیمت</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-price">مبلغ گیفت کارت (دلار)</Label>
            <Input id="p-price" type="number" inputMode="decimal" value={state.priceUsd} onChange={(e) => set("priceUsd", e.target.value)} className="text-left" dir="ltr" />
            {tomanPrice !== null ? (
              <p className="text-right text-[13px] font-bold text-success" dir="auto">
                ≈ {tomanPrice.toLocaleString("fa-IR")} تومان
              </p>
            ) : (
              <p className="text-right text-[11px] text-text-dim" dir="auto">
                {pricing && !(pricing.usdCostToman > 0)
                  ? "نرخ دلار در تنظیمات فروشگاه تنظیم نشده."
                  : "قیمت تومانی از تنظیمات فروشگاه حساب می‌شود."}
              </p>
            )}
          </div>
          <p className="text-right text-[11px] leading-[1.7] text-text-dim">موجودی کد این گیفت کارت در بخش «بانک گیفت کارت» مدیریت می‌شود.</p>
        </Card>

        <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text">تصویر (اختیاری)</p>
          {state.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.imageUrl} alt={state.imageAlt} className="aspect-[1.6] w-full rounded-[8px] bg-surface-alt object-contain" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex aspect-[1.6] w-full flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-border text-text-dim transition-colors hover:border-accent/50 hover:text-text"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-[12px]">{uploading ? "در حال آپلود..." : "انتخاب تصویر"}</span>
            </button>
          )}
          {state.imageUrl && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                تعویض تصویر
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => set("imageUrl", "")} aria-label="حذف تصویر">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
          <Input value={state.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} placeholder="متن جایگزین تصویر (alt) — برای سئو" dir="auto" />
          {!state.imageUrl && (
            <p className="text-right text-[11px] leading-[1.7] text-text-dim">بدون تصویر، خودکار یک کارت استیم با همین مبلغ نمایش داده می‌شود.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
