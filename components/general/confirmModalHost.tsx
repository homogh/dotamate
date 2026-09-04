"use client";

import { AlertTriangle } from "lucide-react";

import { useConfirmStore } from "@/app/stores/useConfirm";

export function ConfirmModalHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
      onClick={() => settle(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[380px] flex-col items-center gap-4 rounded-[12px] border border-border bg-surface p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <div
          className={`flex size-12 items-center justify-center rounded-full ${
            request.danger ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary"
          }`}
        >
          <AlertTriangle size={22} />
        </div>

        {request.title && (
          <p className="text-[16px] font-black text-text" dir="auto">
            {request.title}
          </p>
        )}
        <p className="text-[14px] leading-[1.7] text-text-dim" dir="auto">
          {request.message}
        </p>

        <div className="flex w-full items-center gap-3 pt-1">
          <button
            onClick={() => settle(true)}
            className={`flex-1 rounded-[8px] py-2.5 text-[13px] font-bold text-white ${
              request.danger ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary-hover"
            }`}
            dir="auto"
          >
            {request.confirmLabel ?? "تایید"}
          </button>
          <button
            onClick={() => settle(false)}
            className="flex-1 rounded-[8px] border border-border bg-surface-alt py-2.5 text-[13px] font-bold text-text hover:bg-white/5"
            dir="auto"
          >
            {request.cancelLabel ?? "انصراف"}
          </button>
        </div>
      </div>
    </div>
  );
}
