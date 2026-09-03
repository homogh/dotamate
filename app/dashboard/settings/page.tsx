"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { Switch } from "@/components/ui/switch";
import { RANK_OPTIONS } from "@/components/dashboard/postLabels";
import { POSITIONS, POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

type Tab = "privacy" | "notifications" | "steam" | "account";

const TABS: { value: Tab; label: string }[] = [
  { value: "privacy", label: "حریم خصوصی" },
  { value: "notifications", label: "اعلان‌ها" },
  { value: "steam", label: "اتصال استیم" },
  { value: "account", label: "حساب و پروفایل" },
];

interface SettingsData {
  displayName: string;
  bio: string | null;
  country: string | null;
  languages: string | null;
  mainPosition: string | null;
  rank: string;
  rankTier: number | null;
  steamProfileUrl: string | null;
  notifyBell: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(partial: Partial<SettingsData>) {
    if (!data) return;
    const next = { ...data, ...partial };
    setData(next);
    setSaving(true);
    await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading || !data) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <div className="flex w-full gap-2 rounded-[10px] bg-surface-alt p-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-[8px] py-2.5 text-[14px] transition-colors ${
              tab === t.value ? "bg-primary font-bold text-white" : "text-text-dim hover:text-text"
            }`}
            dir="auto"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && <AccountTab data={data} onSave={save} saving={saving} saved={saved} />}
      {tab === "notifications" && <NotificationsTab data={data} onSave={save} />}
      {tab === "steam" && <SteamTab data={data} onSave={save} />}
      {tab === "privacy" && <PrivacyTab />}
    </div>
  );
}

function AccountTab({
  data,
  onSave,
  saving,
  saved,
}: {
  data: SettingsData;
  onSave: (p: Partial<SettingsData>) => void;
  saving: boolean;
  saved: boolean;
}) {
  const [displayName, setDisplayName] = useState(data.displayName);
  const [bio, setBio] = useState(data.bio ?? "");
  const [mainPosition, setMainPosition] = useState(data.mainPosition ?? "");
  const [rank, setRank] = useState(data.rank);

  return (
    <Card tone="surface" noHover className="w-full gap-6 p-8">
      <p className="w-full text-right text-[18px] font-black text-text" dir="auto">
        ویرایش اطلاعات حساب و پروفایل
      </p>

      <div className="flex w-full items-center justify-end gap-4">
        <div className="flex flex-col items-end gap-1">
          <p className="text-[12px] text-text-dim" dir="auto">
            آواتار از روی نامت خودکار ساخته می‌شه
          </p>
          <p className="text-[11px] text-text-dim/70" dir="auto">
            برای شخصی‌سازی، اسم نمایشیت رو تغییر بده
          </p>
        </div>
        <HeroAvatar name={displayName || data.displayName} size={64} round />
      </div>

      <div className="flex w-full flex-col gap-2">
        <p className="text-[13px] text-text-dim" dir="auto">
          نام کاربری
        </p>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          dir="auto"
          className="w-full rounded-[8px] border border-border bg-surface-alt p-3 text-[14px] text-text focus:outline-none"
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <p className="text-[13px] text-text-dim" dir="auto">
          درباره من (بیوگرافی)
        </p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          dir="auto"
          className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-3 text-[14px] leading-[1.6] text-text focus:outline-none"
        />
      </div>

      <div className="flex w-full gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-[13px] text-text-dim" dir="auto">
            نقش بازی (Position)
          </p>
          <div className="relative">
            <select
              value={mainPosition}
              onChange={(e) => setMainPosition(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-border bg-surface-alt p-3 pl-8 text-[14px] text-text focus:outline-none"
            >
              <option value="">مشخص نشده</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABEL[p]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <p className="text-[13px] text-text-dim" dir="auto">
            رنک فعلی
          </p>
          <div className="relative">
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-border bg-surface-alt p-3 pl-8 text-[14px] text-text focus:outline-none"
            >
              <option value="UNRANKED">بدون رنک</option>
              {RANK_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            onSave({
              displayName,
              bio,
              mainPosition: mainPosition ? (mainPosition as PositionValue) : null,
              rank,
            })
          }
          disabled={saving}
          className="rounded-[8px] bg-primary px-8 py-3 text-[14px] font-black text-white disabled:opacity-60"
          dir="auto"
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
        {saved && (
          <p className="text-[13px] text-success" dir="auto">
            ذخیره شد
          </p>
        )}
      </div>

      <PasswordChangeForm />
    </Card>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/dashboard/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    setBusy(false);
    setMessage(json.message);
    if (json.status === "success") {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 border-t border-border pt-6">
      <p className="w-full text-right text-[14px] font-bold text-text" dir="auto">
        تغییر رمز عبور
      </p>
      <div className="flex w-full gap-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="رمز فعلی"
          dir="ltr"
          className="flex-1 rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="رمز جدید"
          dir="ltr"
          className="flex-1 rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={busy || !currentPassword || newPassword.length < 8}
          className="rounded-[8px] border border-border bg-surface-alt px-6 py-3 text-[13px] font-bold text-text disabled:opacity-50"
          dir="auto"
        >
          تغییر رمز
        </button>
      </div>
      {message && (
        <p className="text-[12px] text-text-dim" dir="auto">
          {message}
        </p>
      )}
    </div>
  );
}

function NotificationsTab({ data, onSave }: { data: SettingsData; onSave: (p: Partial<SettingsData>) => void }) {
  return (
    <Card tone="surface" noHover className="w-full gap-5 p-8">
      <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
        تنظیمات اعلان‌ها
      </p>
      <ToggleRow label="اعلان زنگ داخل سایت" checked={data.notifyBell} onChange={(v) => onSave({ notifyBell: v })} />
      <ToggleRow label="اعلان ایمیلی" checked={data.notifyEmail} onChange={(v) => onSave({ notifyEmail: v })} />
      <ToggleRow label="اعلان پوش (مرورگر)" checked={data.notifyPush} onChange={(v) => onSave({ notifyPush: v })} />
    </Card>
  );
}

function SteamTab({ data, onSave }: { data: SettingsData; onSave: (p: Partial<SettingsData>) => void }) {
  const [url, setUrl] = useState(data.steamProfileUrl ?? "");

  return (
    <Card tone="surface" noHover className="w-full gap-5 p-8">
      <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
        اتصال استیم
      </p>
      <div className="w-full rounded-[8px] bg-surface-alt p-4">
        <p className={`text-[13px] ${data.steamProfileUrl ? "text-success" : "text-text-dim"}`} dir="auto">
          وضعیت: {data.steamProfileUrl ? "لینک پروفایل استیم ثبت شده" : "متصل نیست"}
        </p>
        <p className="mt-1 text-[12px] text-text-dim" dir="auto">
          دوتامیت به استیم متصل نمی‌شه و رنک رو خودکار دریافت نمی‌کنه — رنکت رو خودت توی هر پست اعلام می‌کنی.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <p className="text-[13px] text-text-dim" dir="auto">
          لینک پروفایل استیم (اختیاری)
        </p>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://steamcommunity.com/id/..."
            dir="ltr"
            className="flex-1 rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
          <button
            onClick={() => onSave({ steamProfileUrl: url })}
            className="rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white"
            dir="auto"
          >
            ذخیره
          </button>
        </div>
      </div>
    </Card>
  );
}

function PrivacyTab() {
  return (
    <Card tone="surface" noHover className="w-full gap-4 p-8">
      <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
        حریم خصوصی
      </p>
      <p className="w-full text-right text-[13px] leading-[1.7] text-text-dim" dir="auto">
        پروفایل تو (نام، رنک اعلامی، بیوگرافی و پست‌هات) برای هم‌تیمی‌های احتمالی توی دوتامیت قابل مشاهده‌ست تا بتونن قبل از عضویت
        تصمیم بگیرن. اطلاعات ورود و رمز عبورت هیچ‌وقت نمایش داده نمی‌شه.
      </p>
    </Card>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-border pb-4 last:border-b-0 last:pb-0">
      <Switch checked={checked} onChange={onChange} />
      <p className="text-[13px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}
