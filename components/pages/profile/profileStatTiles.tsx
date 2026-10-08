"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { faNumber } from "@/components/pages/profile/profileFormat";

gsap.registerPlugin(useGSAP);

interface StatTileProps {
  icon: LucideIcon;
  value: number;
  label: string;
  suffix?: string;
  /** 0–100 — draws a thin meter under the number (e.g. win rate). */
  meter?: number;
}

/** Counts up from the last shown value (0 on first paint) whenever `value` changes. */
export function StatTile({ icon: Icon, value, label, suffix = "", meter }: StatTileProps) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const shown = useRef(0);

  useGSAP(
    () => {
      const el = numberRef.current;
      if (!el) return;
      const render = (v: number) => {
        shown.current = v;
        el.textContent = `${faNumber(Math.round(v))}${suffix}`;
      };

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const proxy = { val: shown.current };
        gsap.to(proxy, { val: value, duration: 1.3, ease: "power3.out", onUpdate: () => render(proxy.val) });
        if (meterRef.current && meter !== undefined) {
          gsap.fromTo(meterRef.current, { scaleX: 0 }, { scaleX: meter / 100, duration: 1.3, ease: "power3.out", delay: 0.1 });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        render(value);
        if (meterRef.current && meter !== undefined) gsap.set(meterRef.current, { scaleX: meter / 100 });
      });
    },
    { dependencies: [value, suffix, meter] },
  );

  return (
    <div className="group flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/15 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-text-dim sm:text-[13px]">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-[8px] bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
          <Icon size={15} />
        </span>
      </div>
      <span ref={numberRef} className="text-[26px] font-black leading-none text-text sm:text-[28px]" />
      {meter !== undefined && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-alt">
          <div ref={meterRef} className="h-full w-full origin-right rounded-full bg-gradient-to-l from-accent to-primary" />
        </div>
      )}
    </div>
  );
}

export function MiniStat({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-[10px] bg-surface-alt px-2 py-3", className)}>
      <p className="text-[16px] font-black text-text">{faNumber(value)}</p>
      <p className="text-[11px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-text-dim">{label}</span>
      {children}
    </div>
  );
}
