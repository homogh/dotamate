"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { useToast } from "@/app/stores/useToast";

interface BuyBoxProps {
  /** e.g. "/api/shop/orders" with { productId }, or "/api/shop/market/orders" with { listingId }. */
  checkoutEndpoint: string;
  checkoutPayload: Record<string, unknown>;
  /** Where to come back to after logging in. */
  productPath: string;
  priceToman: number | null;
  isLoggedIn: boolean;
  walletBalance: number;
  needsTradeUrl: boolean;
  soldOut: boolean;
  /** Overrides everything else with a message, e.g. "this is your own listing". */
  blockedReason?: string | null;
}

export function BuyBox({ checkoutEndpoint, checkoutPayload, productPath, priceToman, isLoggedIn, walletBalance, needsTradeUrl, soldOut, blockedReason }: BuyBoxProps) {
  const toast = useToast();
  const canUseWallet = priceToman !== null && walletBalance >= priceToman;
  const [method, setMethod] = useState<"WALLET" | "GATEWAY">(canUseWallet ? "WALLET" : "GATEWAY");
  const [busy, setBusy] = useState(false);

  if (blockedReason) {
    return <Notice text={blockedReason} />;
  }
  if (priceToman === null) {
    return <Notice text="قیمت این محصول هنوز تعیین نشده و فعلاً قابل خرید نیست." />;
  }
  if (soldOut) {
    return <Notice text="موجودی این محصول تمام شده." />;
  }
  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(productPath)}`}
        className="flex w-full items-center justify-center rounded-[8px] bg-primary px-6 py-4 text-[15px] font-black text-white hover:bg-primary-hover"
      >
        برای خرید وارد حسابت شو
      </Link>
    );
  }
  if (needsTradeUrl) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Notice text="برای خرید آیتم باید Trade URL استیمت را ثبت کنی تا آیتم برایت ترید شود." />
        <Link
          href="/dashboard/settings?tab=steam"
          className="flex w-full items-center justify-center rounded-[8px] bg-primary px-6 py-4 text-[15px] font-black text-white hover:bg-primary-hover"
        >
          ثبت Trade URL
        </Link>
      </div>
    );
  }

  async function handleBuy() {
    setBusy(true);
    const res = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...checkoutPayload, paymentMethod: method }),
    });
    const json = await res.json().catch(() => null);
    if (json?.status === "success") {
      window.location.href = json.data.redirectUrl;
      return;
    }
    setBusy(false);
    toast.error(json?.message ?? "خطایی رخ داد.");
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-right text-[13px] font-bold text-text-dim">روش پرداخت</p>
      <MethodOption
        active={method === "WALLET"}
        disabled={!canUseWallet}
        onClick={() => setMethod("WALLET")}
        icon={Wallet}
        title="پرداخت از میت کیف"
        subtitle={
          canUseWallet
            ? `موجودی: ${walletBalance.toLocaleString("fa-IR")} تومان`
            : `موجودی کافی نیست (${walletBalance.toLocaleString("fa-IR")} تومان)`
        }
      />
      <MethodOption
        active={method === "GATEWAY"}
        onClick={() => setMethod("GATEWAY")}
        icon={CreditCard}
        title="درگاه بانکی"
        subtitle="پرداخت با همه کارت‌های عضو شتاب"
      />

      <button
        onClick={handleBuy}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center rounded-[8px] bg-primary px-6 py-4 text-[15px] font-black text-white shadow-[0px_0px_15px_rgba(75,80,230,0.3)] hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "در حال پردازش..." : `پرداخت ${priceToman.toLocaleString("fa-IR")} تومان`}
      </button>
    </div>
  );
}

function MethodOption({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[10px] border p-4 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-primary bg-primary/10" : "border-border bg-surface-alt hover:border-white/20",
      )}
    >
      <span className={cn("size-4 shrink-0 rounded-full border-2", active ? "border-primary bg-primary" : "border-border")} />
      <div className="flex flex-1 flex-col items-end gap-0.5">
        <span className="text-[14px] font-bold text-text">{title}</span>
        <span className="text-[12px] text-text-dim">{subtitle}</span>
      </div>
      <Icon size={20} className="shrink-0 text-accent" />
    </button>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p className="w-full rounded-[8px] border border-border bg-surface-alt px-4 py-3 text-right text-[13px] leading-[1.7] text-text-dim" dir="auto">
      {text}
    </p>
  );
}
