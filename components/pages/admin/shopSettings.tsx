"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Lock, Store, Users } from "lucide-react";

import { Card } from "@/components/general/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/app/stores/useToast";

interface ShopSettingsData {
  usdCostToman: number;
  giftCardMarginPercent: number;
  itemMarginPercent: number;
  marketCommissionPercent: number;
  gatewayFeePercent: number;
  workStartHour: number;
  workEndHour: number;
  lowStockThreshold: number;
  minWithdrawalToman: number;
  payoutHoldHours: number;
  sellerDeadlineHours: number;
  buyerConfirmHours: number;
}

type FieldKey = keyof ShopSettingsData;

const FIELD_GROUPS: { title: string; fields: { key: FieldKey; label: string; hint: string; suffix: string }[] }[] = [
  {
    title: "قیمت‌گذاری",
    fields: [
      { key: "usdCostToman", label: "هزینه هر دلار استیم", hint: "نرخ واقعی شارژ ویزا کارت، با همه کارمزدها", suffix: "تومان" },
      { key: "giftCardMarginPercent", label: "سود گیفت کارت", hint: "روی هزینه تمام‌شده اضافه می‌شود", suffix: "٪" },
      { key: "itemMarginPercent", label: "سود آیتم‌های فروشگاه", hint: "روی هزینه تمام‌شده اضافه می‌شود", suffix: "٪" },
      { key: "gatewayFeePercent", label: "کارمزد درگاه پرداخت", hint: "برای محاسبه سود خالص", suffix: "٪" },
    ],
  },
  {
    title: "بازار کاربران و میت کیف",
    fields: [
      { key: "marketCommissionPercent", label: "کمیسیون بازار کاربران", hint: "از سهم فروشنده کم می‌شود", suffix: "٪" },
      { key: "payoutHoldHours", label: "مدت نگهداری پول فروش", hint: "بعد از تأیید تحویل، پول تا این مدت قابل برداشت نیست", suffix: "ساعت" },
      { key: "minWithdrawalToman", label: "حداقل مبلغ برداشت", hint: "از میت کیف", suffix: "تومان" },
      { key: "sellerDeadlineHours", label: "مهلت ارسال فروشنده", hint: "بعد از پرداخت؛ اگر ارسال نکند، مبلغ به خریدار برمی‌گردد", suffix: "ساعت" },
      { key: "buyerConfirmHours", label: "مهلت تأیید خریدار", hint: "بعد از ارسال؛ اگر اعتراض نکند، خرید خودکار تأیید می‌شود", suffix: "ساعت" },
    ],
  },
  {
    title: "گیفت کارت و ساعت کاری",
    fields: [
      { key: "workStartHour", label: "شروع ساعت کاری", hint: "به وقت تهران؛ برای وقتی که بانک کد خالی است", suffix: "ساعت" },
      { key: "workEndHour", label: "پایان ساعت کاری", hint: "به وقت تهران", suffix: "ساعت" },
      { key: "lowStockThreshold", label: "هشدار کمبود کد", hint: "وقتی موجودی کد یک محصول به این عدد برسد", suffix: "عدد" },
    ],
  },
];

const toman = (n: number) => n.toLocaleString("fa-IR");

export function ShopSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [marketEnabled, setMarketEnabled] = useState(false);
  const [marketInFlight, setMarketInFlight] = useState(0);
  const [togglingMarket, setTogglingMarket] = useState(false);
  const [form, setForm] = useState<Record<FieldKey, string> | null>(null);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/admin/shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        setEnabled(json.data.shopEnabled);
        setMarketEnabled(json.data.marketEnabled);
        setMarketInFlight(json.data.marketInFlight);
        setForm(toForm(json.data.settings));
      });
  }, []);

  async function toggle(next: boolean) {
    setToggling(true);
    const res = await fetch("/api/admin/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopEnabled: next }),
    });
    const json = await res.json();
    setToggling(false);
    if (json.status === "success") {
      setEnabled(json.data.shopEnabled);
      toast.success(json.message);
    } else {
      toast.error(json.message);
    }
  }

  async function toggleMarket(next: boolean) {
    setTogglingMarket(true);
    const res = await fetch("/api/admin/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketEnabled: next }),
    });
    const json = await res.json();
    setTogglingMarket(false);
    if (json.status === "success") {
      setMarketEnabled(json.data.marketEnabled);
      toast.success(json.message);
    } else {
      toast.error(json.message);
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]));
    const res = await fetch("/api/admin/shop/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status === "success") {
      setForm(toForm(json.data));
      toast.success(json.message);
    } else {
      toast.error(json.message);
    }
  }

  if (enabled === null || !form) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full gap-5 p-6">
        <div className="flex w-full items-center justify-between gap-4">
          <div className={toggling ? "pointer-events-none opacity-50" : ""}>
            <Switch checked={enabled} onChange={toggle} />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[18px] font-black text-text" dir="auto">
              حالت فروشگاه
            </p>
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-primary/15">
              <Store size={18} className="text-primary" />
            </div>
          </div>
        </div>

        <p className="w-full text-right text-[14px] leading-[1.7] text-text-dim" dir="auto">
          با روشن کردن این گزینه، لینک «فروشگاه» در منوی بالای سایت ظاهر می‌شود و کاربران می‌توانند وارد فروشگاه شوند. وقتی خاموش است، فروشگاه و همه بخش‌های مربوط به آن در پنل کاربر («سفارش‌های من»، «میت کیف» و ...) برای همه، حتی مدیرها، بسته است و ورود مستقیم با آدرس هم صفحه ۴۰۴ نشان می‌دهد. مدیریت فروشگاه از همین پنل ادمین ادامه دارد.
        </p>

        <div
          className={`flex w-full items-center justify-between rounded-[8px] border px-4 py-3 ${
            enabled ? "border-success/40 bg-success/10" : "border-border bg-surface-alt"
          }`}
        >
          <Link
            href="/shop"
            target="_blank"
            className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"
            dir="auto"
          >
            <ExternalLink size={14} />
            مشاهده فروشگاه
          </Link>
          <div className="flex items-center gap-2" dir="auto">
            {!enabled && <Lock size={14} className="text-text-dim" />}
            <p className={`text-[13px] font-bold ${enabled ? "text-success" : "text-text-dim"}`}>
              {enabled ? "فروشگاه برای همه کاربران فعال است" : "فروشگاه غیرفعال و از دسترس عموم خارج است"}
            </p>
          </div>
        </div>
      </Card>

      <Card tone="surface" noHover className="w-full gap-5 p-6">
        <div className="flex w-full items-center justify-between gap-4">
          <div className={togglingMarket ? "pointer-events-none opacity-50" : ""}>
            <Switch checked={marketEnabled} onChange={toggleMarket} />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[18px] font-black text-text">بازار کاربران</p>
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-primary/15">
              <Users size={18} className="text-primary" />
            </div>
          </div>
        </div>

        <p className="w-full text-right text-[14px] leading-[1.7] text-text-dim">
          وقتی خاموش است، هیچ اثری از بازار کاربران برای کاربران باقی نمی‌ماند: بخش و دسته آن از فروشگاه، «آگهی‌های من» و «فروش‌های من» از پنل کاربر، سفارش‌های بازار و اعلان‌هایش حذف می‌شوند و ورود با آدرس هم برای همه ۴۰۴ می‌دهد.
          {!enabled && " بازار فقط وقتی برای کاربران باز است که خود فروشگاه هم روشن باشد."}
        </p>

        {marketEnabled && marketInFlight > 0 && (
          <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#f59e0b]/60 bg-[#f59e0b]/[0.1] px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#f59e0b]" />
            <p className="text-right text-[13px] leading-[1.8] text-[#f59e0b]">
              {marketInFlight.toLocaleString("fa-IR")} سفارش بازار در جریان است. اگر بازار را خاموش کنی، طرفین دیگر به صفحه سفارش دسترسی ندارند و سفارش‌ها خودکار تسویه می‌شوند: ارسال‌نشده‌ها بعد از مهلت فروشنده به خریدار برمی‌گردند و ارسال‌شده‌ها بعد از مهلت تأیید به فروشنده پرداخت می‌شوند. اعتراض‌ها در پنل مدیریت باقی می‌مانند.
            </p>
          </div>
        )}

        <div className={`flex w-full items-center justify-between rounded-[8px] border px-4 py-3 ${marketEnabled && enabled ? "border-success/40 bg-success/10" : "border-border bg-surface-alt"}`}>
          <Link href="/shop/market" target="_blank" className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline">
            <ExternalLink size={14} />
            مشاهده بازار
          </Link>
          <div className="flex items-center gap-2">
            {!(marketEnabled && enabled) && <Lock size={14} className="text-text-dim" />}
            <p className={`text-[13px] font-bold ${marketEnabled && enabled ? "text-success" : "text-text-dim"}`}>
              {marketEnabled && enabled ? "بازار کاربران برای همه فعال است" : marketEnabled ? "روشن است، ولی تا فروشگاه خاموش است بسته می‌ماند" : "بازار کاربران غیرفعال و از دسترس خارج است"}
            </p>
          </div>
        </div>
      </Card>

      <Card tone="surface" noHover className="w-full gap-6 p-6">
        <div className="flex w-full items-center justify-between">
          <button
            disabled={saving}
            onClick={save}
            className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            dir="auto"
          >
            {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
          </button>
          <p className="text-[18px] font-black text-text" dir="auto">
            تنظیمات فروشگاه
          </p>
        </div>

        {Number(form.usdCostToman) <= 0 && (
          <p className="w-full rounded-[8px] border border-[#f59e0b] bg-[#f59e0b]/[0.13] px-4 py-2.5 text-right text-[13px] text-[#f59e0b]" dir="auto">
            «هزینه هر دلار استیم» هنوز وارد نشده. تا وقتی صفر است هیچ محصولی قیمت نمی‌گیرد و قابل خرید نیست.
          </p>
        )}

        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="flex w-full flex-col gap-3">
            <p className="w-full text-right text-[14px] font-black text-text-dim" dir="auto">
              {group.title}
            </p>
            <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-surface-alt p-4">
                  <span className="text-right text-[13px] font-bold text-text" dir="auto">
                    {field.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[12px] text-text-dim">{field.suffix}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="h-10 text-left"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-right text-[11px] leading-[1.6] text-text-dim" dir="auto">
                    {field.hint}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <PricePreview form={form} />
      </Card>
    </div>
  );
}

function toForm(settings: ShopSettingsData) {
  const keys = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
  return Object.fromEntries(keys.map((k) => [k, String(settings[k])])) as Record<FieldKey, string>;
}

/** Live worked example so the owner sees what a $10 gift card will cost and earn before saving. */
function PricePreview({ form }: { form: Record<FieldKey, string> }) {
  const cost = Number(form.usdCostToman);
  if (!(cost > 0)) return null;

  const usd = 10;
  const baseCost = usd * cost;
  const price = Math.ceil((baseCost * (1 + Number(form.giftCardMarginPercent) / 100)) / 1000) * 1000;
  const gatewayFee = Math.round((price * Number(form.gatewayFeePercent)) / 100);
  const profit = price - baseCost - gatewayFee;

  const rows = [
    ["هزینه تمام‌شده ما", baseCost],
    ["قیمت فروش به کاربر", price],
    ["کارمزد درگاه", gatewayFee],
  ] as const;

  return (
    <div className="flex w-full flex-col gap-2 rounded-[8px] border border-primary/30 bg-primary/[0.06] p-4">
      <p className="text-right text-[13px] font-black text-text" dir="auto">
        پیش‌نمایش: گیفت کارت {usd.toLocaleString("fa-IR")} دلاری
      </p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex w-full items-center justify-between text-[13px]">
          <span className="text-text">{toman(value)} تومان</span>
          <span className="text-text-dim" dir="auto">
            {label}
          </span>
        </div>
      ))}
      <div className="flex w-full items-center justify-between border-t border-border pt-2 text-[13px] font-black">
        <span className={profit >= 0 ? "text-success" : "text-danger"}>
          {toman(profit)} تومان ({((profit / price) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪)
        </span>
        <span className="text-text" dir="auto">
          سود خالص
        </span>
      </div>
    </div>
  );
}
