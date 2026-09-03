"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/general/card";
import { Switch } from "@/components/ui/switch";

interface Settings {
  bannerText: string | null;
  bannerActive: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  signupsEnabled: boolean;
  lobbyChatEnabled: boolean;
  scheduledSessionsEnabled: boolean;
  steamAutoSyncEnabled: boolean;
}

interface HistoryEntry {
  id: number;
  title: string;
  active: boolean;
  authorName: string;
  createdAt: string;
}

const FEATURE_FLAGS: { key: keyof Settings; title: string; desc: string }[] = [
  { key: "signupsEnabled", title: "ثبت‌نام جدید کاربران", desc: "امکان عضویت و ساخت حساب کاربری جدید در دوتامیت" },
  { key: "lobbyChatEnabled", title: "سیستم ارسال چت در لابی", desc: "گفتگوی متنی زنده کاربران در اتاق‌های لابی فعال" },
  { key: "scheduledSessionsEnabled", title: "برنامه‌ریزی جلسات زمان‌بندی", desc: "رزرو و ایجاد لابی برای تاریخ و ساعت‌های آینده" },
  { key: "steamAutoSyncEnabled", title: "سیستم صعود رنک خودکار با استیم", desc: "دریافت اطلاعات و سینک رنک به صورت خودکار از API استیم" },
];

export default function AdminAnnouncementsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bannerDraft, setBannerDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcements", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setSettings(json.data.settings);
          setBannerDraft(json.data.settings.bannerText ?? "");
          setHistory(json.data.history);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function patch(data: Partial<Settings>) {
    setSaving(true);
    const res = await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status === "success") setSettings((s) => (s ? { ...s, ...data } : s));
  }

  if (loading || !settings) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full gap-5 p-6">
        <p className="w-full text-right text-[18px] font-black text-text" dir="auto">
          بنر اطلاع‌رسانی سراسری لابی
        </p>
        <div className="flex w-full flex-col gap-2">
          <p className="w-full text-right text-[13px] text-text-dim" dir="auto">
            متن بنر اطلاعیه
          </p>
          <textarea
            value={bannerDraft}
            onChange={(e) => setBannerDraft(e.target.value)}
            rows={2}
            dir="auto"
            className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-4 text-[14px] text-text focus:outline-none"
          />
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-text" dir="auto">
              نمایش بنر در سایت
            </span>
            <Switch checked={settings.bannerActive} onChange={(v) => patch({ bannerActive: v })} />
          </div>
          <button
            disabled={saving}
            onClick={() => patch({ bannerText: bannerDraft })}
            className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            dir="auto"
          >
            به‌روزرسانی بنر اطلاعیه
          </button>
        </div>
        {settings.bannerActive && bannerDraft && (
          <div className="flex w-full flex-col gap-1.5">
            <p className="text-[12px] text-text-dim" dir="auto">
              پیش‌نمایش بنر بالای سایت:
            </p>
            <div className="flex w-full items-center gap-2 rounded-[6px] border border-[#f59e0b] bg-[#f59e0b]/[0.13] px-4 py-2.5" dir="auto">
              <p className="flex-1 text-right text-[13px] text-[#f59e0b]">{bannerDraft}</p>
              <AlertTriangle size={16} className="text-[#f59e0b]" />
            </div>
          </div>
        )}
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full items-center justify-between">
          <Switch checked={settings.maintenanceMode} onChange={(v) => patch({ maintenanceMode: v })} />
          <p className="text-[18px] font-black text-text" dir="auto">
            حالت تعمیرات و تعلیق موقت سایت
          </p>
        </div>
        <p className="w-full text-right text-[14px] leading-[1.6] text-text-dim" dir="auto">
          با فعال‌سازی این حالت، دسترسی تمام کاربران عادی به پلتفرم قطع شده و صفحه «در دست تعمیر» با متن دلخواه شما نمایش داده می‌شود. فقط مدیران ارشد به بخش مدیریت دسترسی خواهند داشت.
        </p>
      </Card>

      <Card tone="surface" noHover className="w-full gap-5 p-6">
        <p className="w-full text-right text-[18px] font-black text-text" dir="auto">
          مدیریت ویژگی‌ها و قابلیت‌های پلتفرم (Feature Flags)
        </p>
        <div className="flex w-full flex-col gap-4">
          {FEATURE_FLAGS.map((flag) => (
            <div key={flag.key} className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt p-4">
              <Switch checked={Boolean(settings[flag.key])} onChange={(v) => patch({ [flag.key]: v })} />
              <div className="flex flex-col items-end gap-1">
                <p className="text-[14px] font-black text-text" dir="auto">
                  {flag.title}
                </p>
                <p className="text-[12px] text-text-dim" dir="auto">
                  {flag.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {history.length > 0 && (
        <Card tone="surface" noHover className="w-full gap-3 p-6">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            تاریخچه اعلامیه‌ها
          </p>
          {history.map((h) => (
            <div key={h.id} className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt p-3 text-[12px]">
              <p className="text-text-dim">{new Date(h.createdAt).toLocaleString("fa-IR")}</p>
              <p className="truncate text-text" dir="auto">
                {h.title} — توسط {h.authorName}
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
