"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
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
  avatarUrl: string | null;
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
      {tab === "steam" && <SteamTab />}
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
            {data.avatarUrl ? "آواتار از پروفایل استیمت گرفته شده" : "آواتار از روی نامت خودکار ساخته می‌شه"}
          </p>
          <p className="text-[11px] text-text-dim/70" dir="auto">
            {data.avatarUrl ? "برای عوض کردنش، از تب اتصال استیم اکانتت رو تغییر بده" : "برای شخصی‌سازی، اسم نمایشیت رو تغییر بده"}
          </p>
        </div>
        <UserAvatar name={displayName || data.displayName} avatarUrl={data.avatarUrl} size={64} round />
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

interface OnboardingStatus {
  steamConnected: boolean;
  matchDataVerified: boolean;
  matchGateOverride: boolean;
  steamName: string | null;
  steamAvatar: string | null;
}

function SteamTab() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  function load() {
    fetch("/api/onboarding/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setStatus(json.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    const res = await fetch("/api/onboarding/steam/verify", { method: "POST" });
    const json = await res.json();
    setSyncing(false);
    setSyncMessage(json.message ?? null);
    load();
  }

  async function handleReconnect() {
    if (!manualInput.trim()) return;
    setManualBusy(true);
    setManualError(null);
    const res = await fetch("/api/onboarding/steam/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: manualInput.trim() }),
    });
    const json = await res.json();
    setManualBusy(false);
    if (json.status !== "success") {
      setManualError(json.message ?? "اتصال ناموفق بود.");
      return;
    }
    setManualInput("");
    load();
    handleSync();
  }

  if (loading || !status) {
    return <div className="flex h-32 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  const verified = status.matchDataVerified || status.matchGateOverride;

  return (
    <Card tone="surface" noHover className="w-full gap-5 p-8">
      <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
        اتصال استیم
      </p>

      <div className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt p-4">
        <span className={`rounded-[4px] px-2.5 py-1 text-[11px] font-bold ${verified ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`} dir="auto">
          {verified ? "متصل و تایید شده" : status.steamConnected ? "متصل، در انتظار تایید مچ‌ها" : "متصل نیست"}
        </span>
        <div className="flex items-center gap-2">
          {status.steamAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={status.steamAvatar} alt={status.steamName ?? ""} className="size-8 rounded-full" />
          )}
          {status.steamName && (
            <p className="text-[13px] font-bold text-text" dir="auto">
              {status.steamName}
            </p>
          )}
        </div>
      </div>

      {status.steamConnected && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-[8px] border border-border bg-surface-alt px-5 py-2.5 text-[13px] font-bold text-text disabled:opacity-50"
            dir="auto"
          >
            {syncing ? "در حال همگام‌سازی..." : "همگام‌سازی مجدد مچ‌ها"}
          </button>
          {syncMessage && (
            <p className="text-[12px] text-text-dim" dir="auto">
              {syncMessage}
            </p>
          )}
        </div>
      )}

      <div className="flex w-full flex-col gap-2 border-t border-border pt-5">
        <p className="text-[13px] text-text-dim" dir="auto">
          {status.steamConnected ? "تغییر اکانت استیم" : "اتصال با لینک/آیدی استیم"}
        </p>
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="https://steamcommunity.com/id/..."
            dir="ltr"
            className="flex-1 rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
          <button
            onClick={handleReconnect}
            disabled={manualBusy}
            className="rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white disabled:opacity-50"
            dir="auto"
          >
            {manualBusy ? "..." : "اتصال"}
          </button>
        </div>
        {manualError && (
          <p className="text-[12px] text-danger" dir="auto">
            {manualError}
          </p>
        )}
        <a href="/api/auth/steam/login" className="mt-1 text-center text-[12px] text-text-dim underline" dir="auto">
          یا ورود مستقیم با استیم
        </a>
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
