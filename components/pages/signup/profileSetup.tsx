"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

import { AuthShell } from "@/components/general/authShell";
import { Button } from "@/components/ui/button";
import { RANK_OPTIONS } from "@/components/dashboard/postLabels";
import { POSITIONS, POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

interface Status {
  matchDataVerified: boolean;
  matchGateOverride: boolean;
  profileCompletedAt: string | null;
  steamName: string | null;
  steamAvatar: string | null;
}

export function ProfileSetup() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState("UNRANKED");
  const [mainPosition, setMainPosition] = useState<PositionValue>("POS1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        const data = json.data as Status;
        if (data.profileCompletedAt) {
          router.replace("/dashboard");
          return;
        }
        if (!data.matchDataVerified && !data.matchGateOverride) {
          router.replace("/signup/steam");
          return;
        }
        setStatus(data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rank, mainPosition }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.status !== "success") {
      setError(json.message ?? "ذخیره ناموفق بود.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (loading || !status) {
    return (
      <AuthShell title="تکمیل پروفایل" subtitle="در حال بارگذاری...">
        <div className="flex w-full items-center justify-center py-6">
          <Loader2 className="animate-spin text-text-dim" size={24} />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="تکمیل پروفایل" subtitle="رنک و پز اصلیت رو انتخاب کن — بقیه‌ی اطلاعات رو از استیمت گرفتیم.">
      <div className="flex w-full flex-col gap-5">
        {status.steamName && (
          <div className="flex w-full items-center justify-end gap-3 rounded-[8px] border border-border bg-surface-alt p-3">
            <p className="text-[13px] font-bold text-text" dir="auto">
              {status.steamName}
            </p>
            {status.steamAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.steamAvatar} alt={status.steamName} className="size-9 rounded-full" />
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-text-dim" dir="auto">
            پز اصلی (Position)
          </p>
          <div className="relative">
            <select
              value={mainPosition}
              onChange={(e) => setMainPosition(e.target.value as PositionValue)}
              className="w-full appearance-none rounded-[8px] border border-border bg-surface-alt p-3 pl-8 text-[14px] text-text focus:outline-none"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABEL[p]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
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

        {error && (
          <p className="text-sm text-danger" dir="auto">
            {error}
          </p>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={saving}>
          {saving ? "در حال ذخیره..." : "شروع کن"}
        </Button>
      </div>
    </AuthShell>
  );
}
