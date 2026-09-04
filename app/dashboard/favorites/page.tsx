"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";

interface FavoriteItem {
  favoriteId: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  languages: string[];
  lastPlayedTogether: string | null;
  online: boolean;
}

function lastPlayedLabel(iso: string | null) {
  if (!iso) return "هنوز با هم بازی نکردین";
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "آخرین بازی مشترک: کمتر از یک ساعت پیش";
  if (hours < 24) return `آخرین بازی مشترک: ${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "آخرین بازی مشترک: دیروز";
  if (days < 7) return `آخرین بازی مشترک: ${days} روز پیش`;
  return `آخرین بازی مشترک: ${Math.floor(days / 7)} هفته پیش`;
}

export default function FavoritesPage() {
  const router = useRouter();
  const toast = useToast();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [myActivePost, setMyActivePost] = useState<{ id: number; hasOpenSlot: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/dashboard/favorites", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setFavorites(json.data.favorites);
          setMyActivePost(json.data.myActivePost);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMessage(userId: number) {
    setBusyId(userId);
    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") router.push(`/dashboard/messages/${json.data.id}`);
  }

  async function handleInvite(userId: number) {
    if (!myActivePost) return;
    setBusyId(userId);
    const res = await fetch(`/api/posts/${myActivePost.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
  }

  const filtered = favorites.filter((f) => f.displayName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface py-2 pl-3 pr-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی هم‌تیمی ذخیره شده..."
            dir="auto"
            className="w-[220px] bg-transparent text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
          <Search size={16} className="text-text-dim" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[18px] font-black text-text" dir="auto">
            لیست طلایی هم‌تیمی‌ها
          </p>
          <p className="text-[13px] text-text-dim" dir="auto">
            بازیکنانی که قبلاً باهاشون بازی کردی و عملکرد فوق‌العاده‌ای داشتن
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <Card tone="surface" noHover className="w-full items-center gap-2 p-10 text-center">
          <p className="text-[14px] text-text-dim" dir="auto">
            {favorites.length === 0
              ? "هنوز کسی رو به علاقه‌مندی‌ها اضافه نکردی — از پروفایل بازیکن‌ها این کار رو انجام بده."
              : "کسی با این جستجو پیدا نشد."}
          </p>
        </Card>
      ) : (
        <DashboardFadeIn ready={!loading} className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <Card key={f.favoriteId} tone="surface" className="w-full gap-4 p-6">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text-dim" dir="auto">
                    {f.online ? "آنلاین" : "آفلاین"}
                  </span>
                  <div className={`size-2 rounded-full ${f.online ? "bg-success" : "bg-white/10"}`} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[16px] font-black text-text" dir="auto">
                      {f.displayName}
                    </p>
                    <p className="text-[12px] font-bold text-accent" dir="auto">
                      رنک: {f.rank} {f.rankTier ?? ""}
                    </p>
                  </div>
                  <div className={`rounded-full border-2 ${f.online ? "border-success" : "border-transparent"}`}>
                    <UserAvatar name={f.displayName} avatarUrl={f.avatarUrl} size={48} round />
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col items-end gap-1.5">
                <p className="text-[14px] font-bold text-text-dim" dir="auto">
                  {f.mainPosition ?? "پوزیشن نامشخص"}
                </p>
                <p className="text-[12px] text-text-dim" dir="auto">
                  {lastPlayedLabel(f.lastPlayedTogether)}
                </p>
              </div>

              {f.languages.length > 0 && (
                <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                  {f.languages.map((lang) => (
                    <span key={lang} className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11px] text-text" dir="auto">
                      {lang}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex w-full gap-2.5">
                <button
                  onClick={() => handleMessage(f.userId)}
                  disabled={busyId === f.userId}
                  className="flex flex-1 items-center justify-center rounded-[8px] border border-border px-4 py-2.5 text-[13px] font-bold text-text disabled:opacity-50"
                  dir="auto"
                >
                  پیام
                </button>
                <button
                  onClick={() => handleInvite(f.userId)}
                  disabled={!myActivePost?.hasOpenSlot || busyId === f.userId}
                  className="flex flex-1 items-center justify-center rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
                  dir="auto"
                  title={!myActivePost?.hasOpenSlot ? "برای دعوت باید یک پست فعال با جای خالی داشته باشی" : undefined}
                >
                  دعوت مجدد
                </button>
              </div>
            </Card>
          ))}
        </DashboardFadeIn>
      )}
    </div>
  );
}
