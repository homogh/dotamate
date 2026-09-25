import { Check } from "lucide-react";

import { POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

// The host's wanted positions on a lobby card: open slots highlighted, slots
// already filled by an accepted member shown checked off.
export function NeededPositions({ needed, open }: { needed: string[]; open: string[] }) {
  if (!needed.length) return null;

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
      <span className="text-[11px] text-text-dim" dir="auto">
        پوزیشن‌های مورد نیاز:
      </span>
      {needed.map((p) => {
        const filled = !open.includes(p);
        return (
          <span
            key={p}
            className={`flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
              filled ? "bg-surface-alt text-text-dim line-through" : "border border-accent/40 bg-primary/15 text-accent"
            }`}
          >
            {filled && <Check size={10} />}
            {POSITION_LABEL[p as PositionValue]?.split(" - ")[0] ?? p}
          </span>
        );
      })}
    </div>
  );
}
