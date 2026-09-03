"use client";

import { cn } from "@/app/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2", className)}>
      {label && (
        <span className="text-[13px] text-text-dim" dir="auto">
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-alt border border-border",
        )}
      >
        <span
          className="absolute top-0.5 size-4 rounded-full bg-white transition-[right] duration-200"
          style={{ right: checked ? 18 : 2 }}
        />
      </button>
    </label>
  );
}
