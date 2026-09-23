"use client";

import { useState } from "react";
import { Copy, Eye } from "lucide-react";

import { useToast } from "@/app/stores/useToast";

/** Keeps the code blurred until the buyer asks for it, so it isn't exposed on a shared screen. */
export function GiftCodeReveal({ code }: { code: string }) {
  const [shown, setShown] = useState(false);
  const toast = useToast();

  async function copy() {
    await navigator.clipboard.writeText(code).catch(() => null);
    toast.success("کد کپی شد.");
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-[12px] border border-success/40 bg-success/[0.08] p-5">
      <p className="text-right text-[13px] font-bold text-success" dir="auto">
        کد گیفت کارت شما
      </p>
      <div className="flex w-full items-center gap-2">
        <button
          onClick={shown ? copy : () => setShown(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-success px-4 py-3 text-[13px] font-bold text-white"
        >
          {shown ? <Copy size={15} /> : <Eye size={15} />}
          {shown ? "کپی" : "نمایش کد"}
        </button>
        <p
          className={`flex-1 select-all rounded-[8px] bg-bg px-4 py-3 text-center font-mono text-[18px] font-bold tracking-wider text-text transition-[filter] ${
            shown ? "" : "select-none blur-sm"
          }`}
          dir="ltr"
        >
          {shown ? code : "XXXXX-XXXXX-XXXXX"}
        </p>
      </div>
      <p className="text-right text-[12px] leading-[1.7] text-text-dim" dir="auto">
        در استیم به Account details → Add funds to your Steam Wallet → Redeem a Steam Gift Card or Wallet Code برو و کد را وارد کن.
      </p>
    </div>
  );
}
