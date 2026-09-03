"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { RANK_LABEL, REGION_LABEL, GAME_MODE_LABEL } from "@/components/dashboard/postLabels";
import { POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

interface ProfileData {
  id: number;
  displayName: string;
  bio: string | null;
  country: string | null;
  languages: string[];
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  rankVerification: string;
  isSelf: boolean;
  isFavorited: boolean;
  stats: { teammatesFound: number; activePosts: number; totalPosts: number };
  recentPosts: { id: number; position: string; region: string; gameMode: string; status: string; createdAt: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  FULL: "تکمیل ظرفیت",
  COMPLETED: "تکمیل‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغو شده",
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/users/${params.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setProfile(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFavorite() {
    if (!profile) return;
    setBusy(true);
    await fetch(`/api/favorites/${profile.id}`, { method: profile.isFavorited ? "DELETE" : "POST" });
    setBusy(false);
    load();
  }

  async function handleMessage() {
    if (!profile) return;
    setBusy(true);
    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.status === "success") router.push(`/dashboard/messages/${json.data.id}`);
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (!profile) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <p className="text-center text-[14px] text-text-dim" dir="auto">
          کاربر پیدا نشد.
        </p>
      </div>
    );
  }

  const verified = profile.rankVerification === "VERIFIED";

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center gap-6 p-8">
        <div className="flex items-start gap-3">
          {profile.isSelf ? (
            <button
              onClick={() => router.push("/dashboard/settings")}
              className="rounded-[8px] border border-border bg-surface-alt px-6 py-3 text-[14px] font-bold text-text"
              dir="auto"
            >
              ویرایش پروفایل
            </button>
          ) : (
            <>
              <button
                onClick={handleFavorite}
                disabled={busy}
                className="rounded-[8px] border border-border bg-surface-alt px-6 py-3 text-[14px] font-bold text-text disabled:opacity-50"
                dir="auto"
              >
                {profile.isFavorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              </button>
              <button
                onClick={handleMessage}
                disabled={busy}
                className="rounded-[8px] bg-primary px-7 py-3 text-[14px] font-bold text-white disabled:opacity-50"
                dir="auto"
              >
                ارسال پیام
              </button>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {verified && (
              <span className="flex items-center gap-1 rounded-full border border-success bg-success/10 px-2.5 py-0.5 text-[12px] font-bold text-success" dir="auto">
                تایید‌شده
                <BadgeCheck size={12} />
              </span>
            )}
            <p className="text-[24px] font-black text-text" dir="auto">
              {profile.displayName}
            </p>
          </div>
          <p className="w-full text-right text-[14px] leading-[1.7] text-text-dim" dir="auto">
            {profile.bio || "این بازیکن هنوز بایو ننوشته."}
          </p>
        </div>

        <div className="rounded-full border-2 border-primary">
          <HeroAvatar name={profile.displayName} size={80} round />
        </div>
      </Card>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <div className="grid w-full grid-cols-3 gap-4">
            <StatTile value={profile.stats.teammatesFound} label="هم‌تیمی یافته" />
            <StatTile value={profile.stats.activePosts} label="پست فعال" />
            <StatTile value={profile.stats.totalPosts} label="کل پست‌ها" />
          </div>

          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              فعالیت اخیر
            </p>
            {profile.recentPosts.length === 0 ? (
              <p className="w-full py-4 text-center text-[13px] text-text-dim" dir="auto">
                هنوز پستی منتشر نکرده.
              </p>
            ) : (
              <div className="flex w-full flex-col gap-2.5">
                {profile.recentPosts.map((p) => (
                  <div key={p.id} className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt p-3">
                    <span className="rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                      {STATUS_LABEL[p.status]}
                    </span>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="text-text-dim">{GAME_MODE_LABEL[p.gameMode]}</span>
                      <span className="text-text-dim">•</span>
                      <span className="text-text-dim">{REGION_LABEL[p.region]}</span>
                      <span className="text-text-dim">•</span>
                      <span className="font-bold text-text" dir="auto">
                        {POSITION_LABEL[p.position as PositionValue]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card tone="surface" noHover className="w-full gap-4 p-6 lg:w-[380px] lg:shrink-0">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            اطلاعات کلی بازیکن
          </p>
          <div className="flex w-full flex-col gap-3">
            <InfoRow label="رنک" value={`${RANK_LABEL[profile.rank]} ${profile.rankTier ?? ""}`} accent />
            <InfoRow label="نقش اصلی (Pos)" value={profile.mainPosition ? POSITION_LABEL[profile.mainPosition as PositionValue] : "مشخص نشده"} chip />
            <InfoRow label="زبان‌ها" value={profile.languages.length > 0 ? profile.languages.join("، ") : "مشخص نشده"} />
            <InfoRow label="کشور / منطقه" value={profile.country || "مشخص نشده"} />
            <InfoRow label="وضعیت تایید" value={verified ? "تایید‌شده" : "خوداظهاری"} success={verified} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border border-border bg-surface-alt p-5">
      <p className="text-[28px] font-black text-accent">{value.toLocaleString("fa-IR")}</p>
      <p className="text-[13px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}

function InfoRow({ label, value, accent, chip, success }: { label: string; value: string; accent?: boolean; chip?: boolean; success?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0">
      {chip ? (
        <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[12px] font-bold text-accent" dir="auto">
          {value}
        </span>
      ) : (
        <p className={`text-[14px] font-bold ${accent ? "text-accent" : success ? "text-success" : "text-text"}`} dir="auto">
          {value}
        </p>
      )}
      <p className="text-[14px] text-text-dim" dir="auto">
        {label}
      </p>
    </div>
  );
}
