"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/app/stores/useToast";

interface Props {
  withdrawable: number;
  minAmount: number;
  savedSheba: string | null;
  savedHolder: string | null;
}

/** Payout request to the user's own Sheba account; prefilled with the last one used. */
export function WithdrawForm({ withdrawable, minAmount, savedSheba, savedHolder }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState(String(withdrawable));
  const [sheba, setSheba] = useState(savedSheba?.replace(/^IR/, "") ?? "");
  const [holder, setHolder] = useState(savedHolder ?? "");
  const [busy, setBusy] = useState(false);

  if (withdrawable < minAmount) {
    return (
      <p className="rounded-[8px] bg-surface-alt px-4 py-3 text-right text-[13px] leading-[1.8] text-text-dim">
        حداقل مبلغ برداشت {minAmount.toLocaleString("fa-IR")} تومان است. درآمد فروش، بعد از گذشت زمان نگهداری، اینجا قابل برداشت می‌شود.
      </p>
    );
  }

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/shop/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountToman: Math.floor(Number(amount)), sheba, holderName: holder }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (json?.status === "success") {
      toast.success(json.message);
      router.refresh();
    } else {
      toast.error(json?.message ?? "خطایی رخ داد.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-right text-[12px] font-bold text-text">مبلغ (تومان)</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          dir="ltr"
          className="h-11 rounded-[8px] border border-border bg-surface-alt px-4 text-left text-[14px] text-text focus:border-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-right text-[12px] font-bold text-text">شماره شبا</span>
        <div className="flex items-center overflow-hidden rounded-[8px] border border-border bg-surface-alt focus-within:border-primary" dir="ltr">
          <span className="px-3 text-[14px] font-bold text-text-dim">IR</span>
          <input
            value={sheba}
            onChange={(e) => setSheba(e.target.value)}
            inputMode="numeric"
            maxLength={30}
            placeholder="۲۴ رقم"
            className="h-11 flex-1 bg-transparent pr-4 text-left font-mono text-[14px] text-text focus:outline-none"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-right text-[12px] font-bold text-text">نام صاحب حساب</span>
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          className="h-11 rounded-[8px] border border-border bg-surface-alt px-4 text-[14px] text-text focus:border-primary focus:outline-none"
        />
      </label>
      <button onClick={submit} disabled={busy} className="rounded-[8px] bg-primary px-4 py-3 text-[14px] font-black text-white hover:bg-primary-hover disabled:opacity-50">
        {busy ? "در حال ثبت..." : "ثبت درخواست برداشت"}
      </button>
      <p className="text-right text-[11px] leading-[1.7] text-text-dim">حساب باید به نام خودت باشد. واریز پس از بررسی و معمولاً ظرف یک روز کاری انجام می‌شود.</p>
    </div>
  );
}
