"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RatingPoint {
  time: string;
  rankTier: number;
  rankLabel: string;
}

type ChartPoint = RatingPoint & { dateLabel: string };

const RANGE_OPTIONS = [
  { value: "90", label: "۳ ماه" },
  { value: "180", label: "۶ ماه" },
  { value: "all", label: "کل بازه" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

const chartConfig = {
  rankTier: { label: "رنک", color: "var(--color-accent)" },
} satisfies ChartConfig;

/**
 * Rank/medal trend from OpenDota's /ratings — sparse or empty for most
 * modern accounts since Valve stopped exposing numeric MMR broadly, so an
 * empty or single-point state here is the common case, not a bug.
 */
export function RankTrendChart({ points }: { points: RatingPoint[] }) {
  const [range, setRange] = useState<RangeValue>("all");
  const [now] = useState(() => Date.now());

  const sorted = useMemo(
    () => [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
    [points]
  );

  const filtered = useMemo(() => {
    if (range === "all") return sorted;
    const cutoffMs = now - Number(range) * 24 * 60 * 60 * 1000;
    return sorted.filter((p) => new Date(p.time).getTime() >= cutoffMs);
  }, [sorted, range, now]);

  if (sorted.length === 0) {
    return (
      <p className="w-full py-6 text-center text-[13px] leading-[1.8] text-text-dim" dir="auto">
        استیم برای این بازیکن دیتای روند رنک برنمی‌گردونه (معمولاً برای رنک‌های غیر ایمورتال این‌طوریه).
      </p>
    );
  }

  const latest = sorted[sorted.length - 1];
  const rangeStart = filtered[0] ?? sorted[0];
  const delta = latest.rankTier - rangeStart.rankTier;

  const chartData: ChartPoint[] = filtered.map((p) => ({
    ...p,
    dateLabel: new Date(p.time).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-black text-text" dir="auto">
            {latest.rankLabel}
          </span>
          {delta !== 0 && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                delta > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
              dir="ltr"
            >
              {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(delta).toLocaleString("fa-IR")} پله
            </span>
          )}
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as RangeValue)}>
          <TabsList className="h-8">
            {RANGE_OPTIONS.map((o) => (
              <TabsTrigger key={o.value} value={o.value} className="px-2.5 text-[11px]">
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {chartData.length < 2 ? (
        <p className="w-full py-8 text-center text-[13px] text-text-dim" dir="auto">
          توی این بازه‌ی زمانی نقطه‌ی کافی برای رسم روند نیست.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full" dir="ltr">
          <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="rankTierFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              style={{ fontSize: 11 }}
              stroke="var(--color-text-dim)"
            />
            <YAxis hide domain={["dataMin - 3", "dataMax + 3"]} />
            <ChartTooltip cursor={{ stroke: "var(--color-border)" }} content={<RankTooltip />} />
            <Area
              dataKey="rankTier"
              type="monotone"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="url(#rankTierFill)"
              dot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

function RankTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-[6px] border border-border bg-bg-alt px-3 py-2 text-[11px] shadow-lg" dir="rtl">
      <p className="font-bold text-text" dir="auto">
        {point.rankLabel}
      </p>
      <p className="text-text-dim">{new Date(point.time).toLocaleDateString("fa-IR")}</p>
    </div>
  );
}
