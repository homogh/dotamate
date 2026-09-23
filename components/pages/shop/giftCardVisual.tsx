import { cn } from "@/app/lib/utils";

/**
 * Drawn Steam-wallet card (no image asset needed). Colour deepens with the
 * denomination so a row of cards reads as a ladder at a glance.
 */
const TIERS: { minUsd: number; from: string; to: string }[] = [
  { minUsd: 100, from: "#f59e0b", to: "#7c2d12" },
  { minUsd: 50, from: "#8e7bff", to: "#2e1065" },
  { minUsd: 20, from: "#3d3cce", to: "#111827" },
  { minUsd: 0, from: "#1b9ad6", to: "#0b2a45" },
];

export function GiftCardVisual({ usd, className, large = false }: { usd: number; className?: string; large?: boolean }) {
  const tier = TIERS.find((t) => usd >= t.minUsd) ?? TIERS[TIERS.length - 1];

  return (
    <div
      className={cn("relative flex aspect-[1.6] w-full flex-col justify-between overflow-hidden rounded-[12px] p-5", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${tier.from} 0%, ${tier.to} 100%)` }}
      dir="ltr"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 size-44 rounded-full bg-black/20 blur-2xl" />

      <div className="relative flex items-center gap-2">
        <SteamMark className={large ? "size-8" : "size-6"} />
        <span className={cn("font-black tracking-wide text-white", large ? "text-[18px]" : "text-[14px]")}>STEAM</span>
      </div>

      <div className="relative flex items-end justify-between">
        <span className={cn("font-bold uppercase tracking-[0.2em] text-white/70", large ? "text-[12px]" : "text-[10px]")}>
          Wallet Card
        </span>
        <span className={cn("font-black leading-none text-white", large ? "text-[56px]" : "text-[40px]")}>${usd}</span>
      </div>
    </div>
  );
}

function SteamMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="white" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="15.5" cy="9" r="2.5" />
      <circle cx="8.5" cy="15" r="1.8" />
      <path d="m10 14 3.5-3.5" />
    </svg>
  );
}
