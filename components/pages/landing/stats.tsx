import { RevealGroup } from "@/components/general/revealGroup";

const STATS = [
  { value: "۱۰,۰۰۰+", label: "بازیکن فعال ایرانی" },
  { value: "۵۰,۰۰۰+", label: "بازی هماهنگ‌شده" },
  { value: "۴.۸ / ۵", label: "رضایت کاربران" },
];

export function Stats() {
  return (
    <section className="flex w-full border-y border-border bg-surface-alt px-6 py-16 md:px-[100px] md:py-20">
      <RevealGroup className="flex w-full flex-col items-center justify-between gap-8 md:flex-row">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-1 flex-col items-center gap-3">
            <p className="text-[40px] font-black text-accent">{stat.value}</p>
            <p className="text-base font-bold text-text-dim" dir="auto">
              {stat.label}
            </p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
