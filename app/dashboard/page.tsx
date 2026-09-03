"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Clock, Users, Swords, Crosshair, ShieldHalf, HandHeart, ShieldPlus } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";

const POSITION_ICON: Record<string, typeof Swords> = {
  "Pos 1 - Carry": Swords,
  "Pos 2 - Mid": Crosshair,
  "Pos 3 - Offlane": ShieldHalf,
  "Pos 4 - Soft Support": HandHeart,
  "Pos 5 - Hard Support": ShieldPlus,
};

interface HomeData {
  user: { displayName: string; rankLabel: string; rankTier: number | null; mainPosition: string | null };
  stats: { rankLabel: string; rankTier: number | null; hoursThisWeek: number; gamesFoundTotal: number };
  activePost: {
    id: number;
    description: string;
    createdAt: string;
    partySize: number;
    memberCount: number;
  } | null;
  activePostCount: number;
  recommendedPosts: {
    id: number;
    authorName: string;
    authorRank: string;
    authorRankTier: number | null;
    position: string;
    region: string;
    memberCount: number;
    partySize: number;
    createdAt: string;
  }[];
  upcomingSessions: { id: number; title: string; gameMode: string; startAt: string | null }[];
}

const GAME_MODE_LABEL: Record<string, string> = {
  RANKED_ALL_PICK: "Ranked All Pick",
  ALL_PICK: "All Pick",
  TURBO: "Turbo",
  CAPTAINS_MODE: "Captains Mode",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function DashboardHomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/home", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <DashboardFadeIn ready={!loading} className="flex w-full flex-col gap-7">
        {loading ? (
          <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
        ) : (
          <>
            {data?.activePost ? (
              <Card tone="surface" noHover className="w-full gap-5 p-6">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="rounded-[8px] border border-border bg-surface-alt px-4 py-2 text-[13px] font-bold text-text-dim hover:text-text">
                      حذف پست
                    </button>
                    <Link
                      href={`/dashboard/post/${data.activePost.id}`}
                      className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-primary-hover"
                    >
                      ویرایش پست
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-[16px] font-black text-text" dir="auto">
                        {data.activePost.description}
                      </p>
                      <p className="text-[13px] text-text-dim" dir="auto">
                        ثبت شده در: {timeAgo(data.activePost.createdAt)}
                      </p>
                    </div>
                    <div className="size-2 shrink-0 rounded-full bg-success" />
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-[13px] text-text-dim" dir="auto">
                      اعضای پارتی:
                    </p>
                    <div className="flex gap-1">
                      {Array.from({ length: data.activePost.partySize }).map((_, i) => (
                        <div
                          key={i}
                          className={`size-[10px] rounded-full ${
                            i < data.activePost!.memberCount ? "bg-accent" : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[13px] font-bold text-accent" dir="auto">
                      {data.activePost.memberCount}/{data.activePost.partySize} نفر
                    </p>
                  </div>
                  <Link href={`/dashboard/post/${data.activePost.id}`} className="text-[13px] font-bold text-accent">
                    مدیریت اسکواد ←
                  </Link>
                </div>
              </Card>
            ) : (
              <Card tone="surface" noHover className="w-full items-center gap-3 p-8 text-center">
                <p className="text-[16px] font-black text-text" dir="auto">
                  الان پست فعالی نداری
                </p>
                <p className="text-[13px] text-text-dim" dir="auto">
                  یه پست بساز تا بقیه بازیکنا بتونن بهت درخواست عضویت بدن.
                </p>
                <Link
                  href="/dashboard/create-post"
                  className="mt-2 rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white hover:bg-primary-hover"
                >
                  ایجاد پست جدید
                </Link>
              </Card>
            )}

            <div className="flex w-full flex-col gap-4 sm:flex-row">
              <Card tone="surface" noHover className="w-full flex-1 gap-3 p-5">
                <div className="flex w-full items-center justify-between">
                  <Award size={20} className="text-accent" />
                  <p className="text-[13px] text-text-dim" dir="auto">
                    رنک من
                  </p>
                </div>
                <div className="flex w-full items-baseline justify-between">
                  <p className="text-[11px] font-bold text-text-dim" dir="auto">
                    {data?.user.mainPosition ?? "—"}
                  </p>
                  <p className="text-[22px] font-black text-text" dir="auto">
                    {data?.stats.rankLabel} {data?.stats.rankTier ?? ""}
                  </p>
                </div>
              </Card>

              <Card tone="surface" noHover className="w-full flex-1 gap-3 p-5">
                <div className="flex w-full items-center justify-between">
                  <Clock size={20} className="text-accent" />
                  <p className="text-[13px] text-text-dim" dir="auto">
                    تخمین ساعت بازی این هفته
                  </p>
                </div>
                <div className="flex w-full items-baseline justify-end">
                  <p className="text-[22px] font-black text-text" dir="auto">
                    {data?.stats.hoursThisWeek} ساعت
                  </p>
                </div>
              </Card>

              <Card tone="surface" noHover className="w-full flex-1 gap-3 p-5">
                <div className="flex w-full items-center justify-between">
                  <Users size={20} className="text-accent" />
                  <p className="text-[13px] text-text-dim" dir="auto">
                    بازی‌های پیدا شده
                  </p>
                </div>
                <div className="flex w-full items-baseline justify-end">
                  <p className="text-[22px] font-black text-text" dir="auto">
                    {data?.stats.gamesFoundTotal} بازی
                  </p>
                </div>
              </Card>
            </div>

            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full items-center justify-between">
                <Link href="/dashboard/browse" className="text-[14px] font-bold text-accent">
                  مشاهده همه لابی‌ها ←
                </Link>
                <p className="text-[18px] font-black text-text" dir="auto">
                  پست‌های پیشنهادی زنده
                </p>
              </div>

              {data && data.recommendedPosts.length > 0 ? (
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recommendedPosts.map((post, i) => {
                    const PositionIcon = POSITION_ICON[post.position] ?? Swords;
                    return (
                      <Card
                        key={post.id}
                        tone="surface"
                        highlighted={i === 0}
                        className="w-full gap-4 p-5"
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-text-dim" />
                            <p className="text-[12px] text-text-dim">{timeAgo(post.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex flex-col items-end gap-0.5">
                              <p className="text-[14px] font-bold text-text" dir="auto">
                                {post.authorName}
                              </p>
                              <p className="text-[11px] text-accent" dir="auto">
                                {post.authorRank} {post.authorRankTier ?? ""}
                              </p>
                            </div>
                            <HeroAvatar name={post.authorName} size={36} round />
                          </div>
                        </div>

                        <div className="flex w-full flex-col items-end gap-2">
                          <PositionIcon size={20} className="text-accent" />
                          <p className="text-[13px] font-bold text-text-dim" dir="auto">
                            {post.position}
                          </p>
                          <div className="flex gap-1.5">
                            <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                              {post.region}
                            </span>
                            <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] text-accent" dir="auto">
                              پارتی: {post.memberCount}/{post.partySize}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/dashboard/post/${post.id}`}
                          className={`flex w-full items-center justify-center rounded-[8px] px-4 py-2.5 text-[13px] font-bold ${
                            i === 0
                              ? "bg-primary text-white hover:bg-primary-hover"
                              : "border border-border bg-surface-alt text-text hover:bg-white/5"
                          }`}
                        >
                          درخواست عضویت سریع
                        </Link>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card tone="surface" noHover className="w-full items-center gap-2 p-8 text-center">
                  <p className="text-[14px] text-text-dim" dir="auto">
                    فعلاً پست زنده‌ای برای پیشنهاد نیست — بعداً دوباره سر بزن.
                  </p>
                </Card>
              )}
            </div>

            <div className="flex w-full flex-col gap-5 lg:flex-row">
              <Card tone="surface" noHover className="w-full flex-1 gap-5 p-6">
                <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                  میانبرها و دسترسی سریع
                </p>
                <div className="flex w-full gap-3">
                  <Link
                    href="/dashboard/create-post"
                    className="flex flex-1 items-center justify-center rounded-[8px] bg-primary p-4 text-[14px] font-bold text-white hover:bg-primary-hover"
                  >
                    ایجاد پست جدید
                  </Link>
                  <Link
                    href="/dashboard/browse"
                    className="flex flex-1 items-center justify-center rounded-[8px] border border-border bg-surface-alt p-4 text-[14px] font-bold text-text hover:bg-white/5"
                  >
                    مرور همه پست‌ها
                  </Link>
                </div>
              </Card>

              <Card tone="surface" noHover className="w-full flex-1 gap-4 p-6">
                <div className="flex w-full items-center justify-between">
                  <Link href="/dashboard/sessions" className="text-[13px] font-bold text-accent">
                    مشاهده همه ←
                  </Link>
                  <p className="text-[16px] font-black text-text" dir="auto">
                    جلسات هماهنگ‌شده آینده
                  </p>
                </div>
                {data && data.upcomingSessions.length > 0 ? (
                  <div className="flex w-full flex-col gap-2.5">
                    {data.upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt p-4"
                      >
                        <span className="rounded-[4px] bg-surface px-2.5 py-1 text-[11px] font-bold text-accent">
                          {GAME_MODE_LABEL[session.gameMode]}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[14px] font-bold text-text" dir="auto">
                            {session.title}
                          </p>
                          <p className="text-[12px] text-text-dim" dir="auto">
                            {session.startAt
                              ? new Date(session.startAt).toLocaleString("fa-IR", {
                                  weekday: "long",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="w-full py-4 text-center text-[13px] text-text-dim" dir="auto">
                    هنوز جلسه‌ای هماهنگ نکردی.
                  </p>
                )}
              </Card>
            </div>
          </>
        )}
      </DashboardFadeIn>
    </div>
  );
}
