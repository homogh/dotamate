"use client";

import { useState } from "react";

import { cn } from "@/app/lib/utils";
import { useToast } from "@/app/stores/useToast";

const PRESETS = [100_000, 500_000, 1_000_000, 2_500_000];

export function TopUpForm() {
  const toast = useToast();
  const [amount, setAmount] = useState(PRESETS[1]);
  const [busy, setBusy] = useState(false);

  async function handleTopUp() {
    setBusy(true);
    const res = await fetch("/api/shop/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountToman: amount }),
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
    <div className="flex w-full flex-col gap-4">
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={cn(
              "rounded-[8px] border px-3 py-2.5 text-[13px] font-bold transition-colors",
              amount === preset ? "border-primary bg-primary/15 text-text" : "border-border bg-surface-alt text-text-dim hover:border-white/20",
            )}
          >
            {preset.toLocaleString("fa-IR")}
          </button>
        ))}
      </div>
      <div className="flex w-full items-center gap-2">
        <span className="shrink-0 text-[13px] text-text-dim">تومان</span>
        <input
          type="number"
          inputMode="numeric"
          min={10_000}
          step={10_000}
          value={amount || ""}
          onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
          dir="ltr"
          className="h-11 flex-1 rounded-[8px] border border-border bg-surface-alt px-4 text-left text-[14px] text-text focus:border-primary focus:outline-none"
        />
      </div>
      <button
        onClick={handleTopUp}
        disabled={busy || amount < 10_000}
        className="w-full rounded-[8px] bg-primary px-6 py-3.5 text-[14px] font-black text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "در حال انتقال به درگاه..." : `شارژ ${amount.toLocaleString("fa-IR")} تومان`}
      </button>
    </div>
  );
}
