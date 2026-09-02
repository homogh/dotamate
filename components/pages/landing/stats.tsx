import { RevealGroup } from "@/components/general/revealGroup";
import { CountUpStat } from "@/components/general/countUpStat";

const STATS = [
  { target: 10000, suffix: "+", label: "بازیکن فعال ایرانی" },
  { target: 50000, suffix: "+", label: "بازی هماهنگ‌شده" },
  { target: 4.8, decimals: 1, suffix: " / ۵", label: "رضایت کاربران" },
];

export function Stats() {
  return (
    <section className="flex w-full border-y border-border bg-surface-alt px-6 py-16 md:px-[100px] md:py-20">
      <RevealGroup className="flex w-full flex-col items-center justify-between gap-8 md:flex-row">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-1 flex-col items-center gap-3">
            <CountUpStat
              target={stat.target}
              decimals={stat.decimals}
              suffix={stat.suffix}
              className="text-[40px] font-black tabular-nums text-accent"
            />
            <p className="text-base font-bold text-text-dim" dir="auto">
              {stat.label}
            </p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
