"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, Mail, MailCheck, MailX, MousePointerClick, UserCheck } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { useConfirm } from "@/app/stores/useConfirm";
import { Card } from "@/components/general/card";
import { Pagination } from "@/components/general/pagination";
import { Switch } from "@/components/ui/switch";

interface StepStat {
  step: number;
  label: string;
  sent: number;
  opened: number;
  clicked: number;
  completed: number;
}

interface Recipient {
  userId: number;
  displayName: string;
  email: string | null;
  lastStep: number;
  lastSentAt: string;
  opened: boolean;
  clicked: boolean;
  completedAt: string | null;
  convertedStep: number | null;
}

interface EmailStats {
  enabled: boolean;
  canEdit: boolean;
  devMode: boolean;
  summary: {
    recipients: number;
    opened: number;
    clicked: number;
    completed: number;
    completedAfterClick: number;
    incompleteWithEmail: number;
    notYetEmailed: number;
    unsubscribed: number;
  };
  steps: StepStat[];
  recipients: Recipient[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}

const FILTER_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "clicked", label: "کلیک کردن" },
  { value: "completed", label: "ثبت‌نام کامل شد" },
  { value: "incomplete", label: "هنوز ناقص" },
];

const STEP_SHORT = ["", "اول", "دوم", "آخر"];

function fa(n: number) {
  return n.toLocaleString("fa-IR");
}

function percent(part: number, whole: number) {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100).toLocaleString("fa-IR")}٪`;
}

export default function AdminEmailsPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();

  const load = useCallback(() => {
    const params = new URLSearchParams({ filter, page: String(page) });
    return fetch(`/api/admin/emails?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const [prevFilter, setPrevFilter] = useState(filter);
  if (filter !== prevFilter) {
    setPrevFilter(filter);
    setPage(1);
  }

  const toggleReminders = async (enabled: boolean) => {
    if (!data || toggling) return;
    if (
      enabled &&
      !(await confirmAction({
        title: "روشن کردن ایمیل‌های یادآوری",
        message: `از همین حالا به ${fa(data.summary.notYetEmailed)} کاربری که ثبت‌نامشون ناقصه، بین ۹ صبح تا ۱۰ شب و ساعتی حداکثر ۱۰۰ نفر، یادآوری اول ارسال می‌شه. روشن بشه؟`,
        confirmLabel: "روشن کن",
      }))
    )
      return;

    setToggling(true);
    const res = await fetch("/api/admin/emails", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const json = await res.json().catch(() => null);
    setToggling(false);
    if (json?.status === "success") {
      toast.success(json.message);
      load();
    } else {
      toast.error(json?.message ?? "تغییر وضعیت ارسال ناموفق بود.");
    }
  };

  if (!data) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">
        {loading ? "در حال بارگذاری..." : "آمار ایمیل‌ها بارگذاری نشد."}
      </div>
    );
  }

  const { summary } = data;
  const funnel = [
    { label: "ایمیل گرفتن", value: summary.recipients, color: "bg-primary" },
    { label: "باز کردن", value: summary.opened, color: "bg-accent" },
    { label: "روی دکمه زدن", value: summary.clicked, color: "bg-[#38bdf8]" },
    { label: "ثبت‌نام رو کامل کردن", value: summary.completed, color: "bg-success" },
  ];
  const funnelMax = Math.max(1, summary.recipients);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-col items-stretch gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={data.enabled} onChange={(v) => data.canEdit && toggleReminders(v)} className={data.canEdit && !toggling ? "" : "pointer-events-none opacity-50"} />
          <span
            className={`rounded-[4px] px-2 py-0.5 text-[12px] font-bold ${data.enabled ? "bg-success/[0.13] text-success" : "bg-surface-alt text-text-dim"}`}
            dir="auto"
          >
            {data.enabled ? "روشن" : "خاموش"}
          </span>
        </div>
        <div className="flex items-start gap-3" dir="rtl">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-surface-alt">
            {data.enabled ? <MailCheck size={18} className="text-success" /> : <MailX size={18} className="text-text-dim" />}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-black text-text" dir="auto">
              ارسال خودکار ایمیل یادآوری ثبت‌نام
            </p>
            <p className="text-[12px] leading-[1.9] text-text-dim" dir="auto">
              {data.enabled
                ? "کاربرهای ثبت‌نام ناقص روز ۱، ۳ و ۷ بعد از ثبت‌نام خودکار ایمیل می‌گیرن (بین ۹ صبح تا ۱۰ شب)."
                : "خاموشه؛ هیچ ایمیل یادآوری‌ای ارسال نمی‌شه."}
              {!data.canEdit && " برای تغییرش دسترسی ویرایش کاربران لازمه."}
              {data.devMode && " (روی محیط توسعه ارسال واقعی انجام نمی‌شه.)"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard icon={Mail} label="ایمیل گرفتن" value={fa(summary.recipients)} hint="نفر" />
        <KpiCard icon={Eye} label="باز کردن" value={fa(summary.opened)} hint={percent(summary.opened, summary.recipients)} />
        <KpiCard icon={MousePointerClick} label="روی دکمه زدن" value={fa(summary.clicked)} hint={percent(summary.clicked, summary.recipients)} />
        <KpiCard
          icon={UserCheck}
          label="ثبت‌نام کامل شد"
          value={fa(summary.completed)}
          hint={percent(summary.completed, summary.recipients)}
          highlight
        />
        <KpiCard icon={Clock} label="در صف ارسال" value={fa(summary.notYetEmailed)} hint="هنوز ایمیلی نگرفتن" />
      </div>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <Card tone="surface" noHover className="w-full flex-1 gap-5 p-6">
          <div className="flex w-full items-center justify-between">
            <p className="text-[12px] text-text-dim" dir="auto">
              از {fa(summary.recipients)} نفری که ایمیل گرفتن
            </p>
            <p className="text-[16px] font-black text-text" dir="auto">
              قیف یادآوری ثبت‌نام
            </p>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="flex w-full flex-col gap-4" dir="rtl">
            {funnel.map((f) => (
              <div key={f.label} className="flex w-full flex-col gap-1.5">
                <div className="flex w-full items-center justify-between text-[13px]">
                  <p className="font-bold text-text" dir="auto">
                    {f.label}
                  </p>
                  <p className="text-text-dim" dir="auto">
                    {fa(f.value)} نفر · {percent(f.value, summary.recipients)}
                  </p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.value / funnelMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="w-full text-right text-[11.5px] leading-[1.9] text-text-dim" dir="auto">
            «ثبت‌نام کامل شد» یعنی کاربر بعد از گرفتن ایمیل ثبت‌نامش رو تموم کرده. {fa(summary.completedAfterClick)} نفر از این‌ها مستقیم از
            دکمه‌ی ایمیل اومدن. آمار باز کردن تقریبیه: بعضی سرویس‌ها عکس‌ها رو نشون نمی‌دن و اپل‌میل ایمیل رو خودکار باز می‌کنه.
          </p>
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6 lg:w-[360px] lg:shrink-0">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            کاربرهای ثبت‌نام ناقص
          </p>
          <div className="h-px w-full bg-border" />
          <InfoRow label="کل ثبت‌نام‌های ناقص با ایمیل" value={fa(summary.incompleteWithEmail)} />
          <InfoRow label="هنوز هیچ یادآوری‌ای نگرفتن" value={fa(summary.notYetEmailed)} />
          <InfoRow label="لغو اشتراک ایمیل کردن" value={fa(summary.unsubscribed)} />
          <p className="w-full text-right text-[11.5px] leading-[1.9] text-text-dim" dir="auto">
            کاربرهای «در صف» از روز بعد از ثبت‌نام، بین ۹ صبح تا ۱۰ شب، خودکار ایمیل می‌گیرن.
          </p>
        </Card>
      </div>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
          عملکرد هر ایمیل
        </p>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">ایمیل</th>
                <th className="p-3 text-right font-bold">ارسال</th>
                <th className="p-3 text-right font-bold">باز شده</th>
                <th className="p-3 text-right font-bold">کلیک</th>
                <th className="p-3 text-right font-bold">ثبت‌نام کامل شد</th>
              </tr>
            </thead>
            <tbody>
              {data.steps.map((s) => (
                <tr key={s.step} className="border-b border-border text-[13px]">
                  <td className="p-3 font-bold text-text" dir="auto">
                    {s.label}
                  </td>
                  <td className="p-3 text-text">{fa(s.sent)}</td>
                  <td className="p-3 text-text-dim">
                    {fa(s.opened)} <span className="text-[11px]">({percent(s.opened, s.sent)})</span>
                  </td>
                  <td className="p-3 text-text-dim">
                    {fa(s.clicked)} <span className="text-[11px]">({percent(s.clicked, s.sent)})</span>
                  </td>
                  <td className="p-3 font-bold text-success">
                    {fa(s.completed)} <span className="text-[11px] font-normal">({percent(s.completed, s.sent)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter(o.value)}
                className={`whitespace-nowrap rounded-[8px] px-4 py-2 text-[13px] ${
                  filter === o.value ? "bg-primary font-bold text-white" : "border border-border text-text-dim"
                }`}
                dir="auto"
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-right text-[16px] font-black text-text" dir="auto">
            کاربرهایی که ایمیل گرفتن
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[840px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">عملیات</th>
                <th className="p-3 text-right font-bold">وضعیت ثبت‌نام</th>
                <th className="p-3 text-right font-bold">کلیک</th>
                <th className="p-3 text-right font-bold">باز شده</th>
                <th className="p-3 text-right font-bold">آخرین ایمیل</th>
                <th className="p-3 text-right font-bold">ایمیل</th>
                <th className="p-3 text-right font-bold">نام کاربر</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim" dir="auto">
                    هنوز کسی با این فیلتر نیست.
                  </td>
                </tr>
              ) : (
                data.recipients.map((r) => (
                  <tr key={r.userId} className="border-b border-border text-[13px]">
                    <td className="p-3">
                      <Link href={`/admin/users/${r.userId}`} className="font-bold text-accent" dir="auto">
                        مشاهده
                      </Link>
                    </td>
                    <td className="p-3">
                      {r.convertedStep ? (
                        <span className="rounded-[4px] bg-success/[0.13] px-2 py-0.5 text-[12px] font-bold text-success" dir="auto">
                          کامل شد · بعد از یادآوری {STEP_SHORT[r.convertedStep]}
                        </span>
                      ) : (
                        <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[12px] font-bold text-text-dim" dir="auto">
                          هنوز ناقص
                        </span>
                      )}
                    </td>
                    <td className="p-3">{r.clicked && <MousePointerClick size={16} className="text-[#38bdf8]" />}</td>
                    <td className="p-3">{r.opened && <CheckCircle2 size={16} className="text-accent" />}</td>
                    <td className="p-3 text-text-dim" dir="auto">
                      یادآوری {STEP_SHORT[r.lastStep]} · {new Date(r.lastSentAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="p-3 text-text-dim" dir="ltr">
                      {r.email ?? "—"}
                    </td>
                    <td className="p-3 font-bold text-text" dir="auto">
                      {r.displayName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="w-full text-center text-[12px] text-text-dim" dir="auto">
          {fa(data.total)} نفر
        </p>
        <Pagination page={page} totalPages={data.pageCount} onChange={setPage} />
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-[12px] border bg-surface p-5 ${highlight ? "border-success/40" : "border-border"}`}>
      <div className="flex w-full items-center justify-between">
        <div className="flex size-6 items-center justify-center rounded-[6px] bg-surface-alt">
          <Icon size={14} className={highlight ? "text-success" : "text-text-dim"} />
        </div>
        <p className="text-[13px] text-text-dim" dir="auto">
          {label}
        </p>
      </div>
      <div className="flex w-full items-baseline justify-between">
        <p className={`text-[12px] ${highlight ? "font-bold text-success" : "text-text-dim"}`} dir="auto">
          {hint}
        </p>
        <p className="text-[26px] font-black text-text">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt px-4 py-3">
      <p className="text-[16px] font-black text-text">{value}</p>
      <p className="text-[13px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}
