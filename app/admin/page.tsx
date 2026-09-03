"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Award, MessageSquare, Calendar, AlertTriangle } from "lucide-react";

import { Card } from "@/components/general/card";

interface OverviewData {
  metrics: {
    totalUsers: number;
    activeToday: number;
    activePosts: number;
    sessionsToday: number;
    openReports: number;
  };
  recentReports: { id: number; userName: string; reason: string; severity: string; severityLabel: string; createdAt: string }[];
  weeklySignups: { label: string; count: number }[];
}

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "bg-surface-alt text-text-dim",
  MEDIUM: "bg-accent/[0.13] text-accent",
  HIGH: "bg-[#ff9f0a]/[0.13] text-[#ff9f0a]",
  CRITICAL: "bg-danger/[0.13] text-danger",
};

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  const maxWeek = Math.max(1, ...data.weeklySignups.map((w) => w.count));

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard icon={Users} label="کل کاربران" value={data.metrics.totalUsers} />
        <KpiCard icon={Award} label="کاربران فعال روزانه" value={data.metrics.activeToday} />
        <KpiCard icon={MessageSquare} label="پست‌های فعال لابی" value={data.metrics.activePosts} />
        <KpiCard icon={Calendar} label="جلسات هماهنگ امروز" value={data.metrics.sessionsToday} />
        <KpiCard icon={AlertTriangle} label="گزارش‌های باز تخلف" value={data.metrics.openReports} />
      </div>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <Card tone="surface" noHover className="w-full gap-5 p-6 lg:w-[450px] lg:shrink-0">
          <div className="flex w-full items-center justify-between">
            <button onClick={() => router.push("/admin/reports")} className="text-[12px] font-bold text-accent" dir="auto">
              بررسی سریع ←
            </button>
            <p className="text-[16px] font-black text-text" dir="auto">
              گزارش‌های تخلف اخیر
            </p>
          </div>
          <div className="h-px w-full bg-border" />
          {data.recentReports.length === 0 ? (
            <p className="w-full py-6 text-center text-[13px] text-text-dim" dir="auto">
              گزارش بازی برای بررسی نیست.
            </p>
          ) : (
            <div className="flex w-full flex-col gap-3">
              {data.recentReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push("/admin/reports")}
                  className="flex w-full items-start gap-3 rounded-[8px] border border-border bg-surface-alt p-3 text-right"
                >
                  <span className={`rounded-[4px] px-2 py-0.5 text-[11px] font-black ${SEVERITY_STYLE[r.severity]}`} dir="auto">
                    {r.severityLabel}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-text-dim">{timeAgo(r.createdAt)}</p>
                      <p className="text-[14px] font-extrabold text-text" dir="auto">
                        {r.userName}
                      </p>
                    </div>
                    <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
                      {r.reason}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card tone="surface" noHover className="w-full flex-1 gap-5 p-6">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-accent" />
              <p className="text-[12px] text-text-dim" dir="auto">
                کاربران ثبت‌نامی
              </p>
            </div>
            <p className="text-[16px] font-black text-text" dir="auto">
              نمودار رشد هفتگی پلتفرم
            </p>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="flex h-[200px] w-full items-end justify-center gap-4">
            {data.weeklySignups.map((w) => (
              <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <p className="text-[12px] font-bold text-text">{w.count}</p>
                <div
                  className="w-full rounded-t-[6px] bg-accent"
                  style={{ height: `${Math.max(4, (w.count / maxWeek) * 160)}px` }}
                />
                <p className="text-[12px] text-text-dim" dir="auto">
                  {w.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-5">
      <div className="flex w-full items-center justify-between">
        <div className="flex size-6 items-center justify-center rounded-[6px] bg-surface-alt">
          <Icon size={14} className="text-text-dim" />
        </div>
        <p className="text-[13px] text-text-dim" dir="auto">
          {label}
        </p>
      </div>
      <div className="flex w-full items-baseline justify-between">
        <span />
        <p className="text-[24px] font-black text-text">{value.toLocaleString("fa-IR")}</p>
      </div>
    </div>
  );
}
