"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";

import { useToastStore } from "@/app/stores/useToast";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[10px] border p-4 shadow-[0_12px_32px_rgba(0,0,0,0.4)] ${
            t.type === "success" ? "border-success bg-success/[0.12]" : "border-danger bg-danger/[0.12]"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={20} className="shrink-0 text-success" />
          ) : (
            <XCircle size={20} className="shrink-0 text-danger" />
          )}
          <p className={`flex-1 text-right text-[13px] font-bold ${t.type === "success" ? "text-success" : "text-danger"}`} dir="auto">
            {t.message}
          </p>
          <button onClick={() => dismiss(t.id)} aria-label="بستن" className="shrink-0 text-text-dim hover:text-text">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
