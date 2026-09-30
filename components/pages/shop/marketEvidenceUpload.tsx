"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";

import { useToast } from "@/app/stores/useToast";

/** Lets a buyer/seller attach dispute evidence (screenshots/short clips) to a DISPUTED market order. */
export function MarketEvidenceUpload({ orderId }: { orderId: number }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file);

    setBusy(true);
    const res = await fetch(`/api/shop/market/orders/${orderId}/evidence`, { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (json?.status === "success") {
      toast.success(json.message);
      router.refresh();
    } else {
      toast.error(json?.message ?? "آپلود مدرک ناموفق بود.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-[8px] border border-border bg-surface-alt p-4">
      <p className="text-right text-[13px] font-bold text-text">پیوست مدرک برای پشتیبانی</p>
      <p className="text-right text-[11px] leading-[1.8] text-text-dim">
        اسکرین‌شات پیشنهاد ترید استیم، تأییدیه ارسال/دریافت یا هر مدرک دیگری را اینجا آپلود کن. حداکثر ۴ فایل (عکس یا یک ویدیوی کوتاه).
      </p>
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[8px] border border-primary/40 px-4 py-2 text-[12px] font-bold text-primary hover:bg-primary/10">
        <Paperclip size={14} />
        {busy ? "در حال آپلود..." : "انتخاب فایل"}
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
    </div>
  );
}
