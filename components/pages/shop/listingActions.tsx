"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";

/** Inline price edit + take-down for one of the seller's own active listings. */
export function ListingActions({ listingId, priceToman }: { listingId: number; priceToman: number }) {
  const router = useRouter();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(priceToman));
  const [busy, setBusy] = useState(false);

  async function send(method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    const res = await fetch(`/api/shop/market/listings/${listingId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (json?.status === "success") {
      toast.success(json.message);
      setEditing(false);
      router.refresh();
    } else {
      toast.error(json?.message ?? "خطایی رخ داد.");
    }
  }

  async function remove() {
    if (!(await confirmAction({ message: "این آگهی از بازار حذف شود؟", danger: true, confirmLabel: "حذف آگهی" }))) return;
    send("DELETE");
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          dir="ltr"
          className="h-9 w-[130px] rounded-[6px] border border-border bg-surface px-3 text-left text-[13px] text-text focus:border-primary focus:outline-none"
        />
        <button disabled={busy} onClick={() => send("PATCH", { priceToman: Number(price) })} className="rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">
          ذخیره
        </button>
        <button onClick={() => setEditing(false)} className="px-1.5 text-[12px] text-text-dim hover:text-text">
          انصراف
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <button disabled={busy} onClick={remove} className="rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger disabled:opacity-50">
        حذف
      </button>
      <button onClick={() => setEditing(true)} className="rounded-[6px] border border-border px-2.5 py-1.5 font-bold text-accent">
        تغییر قیمت
      </button>
    </div>
  );
}
