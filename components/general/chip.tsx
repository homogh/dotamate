import { cn } from "@/app/lib/utils";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Shared pill filter control — used on /meta and /blog wherever a filter row appears. */
export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[20px] px-5 py-2 text-[13px] font-bold transition-all duration-200 active:scale-95",
        active
          ? "bg-primary text-white shadow-[0_0_16px_rgba(75,80,230,0.4)]"
          : "border border-border bg-surface text-text-dim hover:border-white/20 hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
