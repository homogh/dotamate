"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { SectionHeading } from "@/components/general/sectionHeading";

interface LatestLobby {
  id: number; authorName: string; authorAvatarUrl: string | null; rank: string;
  position: string; region: string; hasVoice: boolean; description: string;
  createdAt: string; memberCount: number; partySize: number;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} ساعت پیش` : `${Math.floor(hours / 24)} روز پیش`;
}

export function LivePreview() {
  const [lobby, setLobby] = useState<LatestLobby | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/landing", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setLobby(json.status === "success" ? json.data.latestLobby : null))
      .catch(() => setLobby(null));
  }, []);

  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg px-6 py-20 md:px-[100px]">
      <SectionHeading eyebrow="پست‌های زنده" title="آخرین پارتیِ در حال تشکیل" subtitle="این کارت مستقیماً از آخرین لابی فعال دوتامیت به‌روزرسانی می‌شود" />

      <div className="flex w-full justify-center">
        {lobby === undefined ? (
          <Card className="w-full max-w-[680px] items-center py-12 text-center"><span className="size-8 animate-pulse rounded-full bg-primary/40" /><p className="text-sm font-bold text-text-dim">در حال دریافت آخرین لابی…</p></Card>
        ) : lobby ? (
          <Card highlighted className="w-full max-w-[680px] gap-6" dir="rtl">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-text-dim"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-success" /></span><span>{relativeTime(lobby.createdAt)}</span></div>
              <div className="flex items-center gap-3"><div className="text-right"><p className="text-base font-black text-text">{lobby.authorName}</p><p className="mt-1 text-xs font-bold text-accent">رنک: {lobby.rank}</p></div><UserAvatar name={lobby.authorName} avatarUrl={lobby.authorAvatarUrl} size={48} /></div>
            </div>
            <p className="w-full text-right text-base leading-[1.8] text-text-dim">{lobby.description}</p>
            <div className="flex w-full flex-wrap justify-end gap-2"><span className="rounded-full border border-accent/60 bg-primary/15 px-3 py-1.5 text-xs font-bold text-accent">{lobby.position}</span><span className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text">ریجن: {lobby.region}</span>{lobby.hasVoice && <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-bold text-success">وویس فعال</span>}</div>
            <div className="flex w-full items-center justify-between border-t border-border pt-4"><Button asChild size="sm"><Link href={`/dashboard/post/${lobby.id}`}>مشاهده و درخواست عضویت</Link></Button><p className="text-sm font-extrabold text-text">{lobby.memberCount} از {lobby.partySize} نفر</p></div>
          </Card>
        ) : (
          <Card className="w-full max-w-[680px] items-center gap-5 border-dashed py-12 text-center" dir="rtl"><div className="flex size-16 items-center justify-center rounded-2xl border border-accent/30 bg-primary/10 text-3xl">⚔</div><div><p className="text-xl font-black text-text">هنوز لابی فعالی تشکیل نشده</p><p className="mt-2 text-sm leading-7 text-text-dim">اولین پارتی امروز را خودت بساز و هم‌تیمی‌های مناسب پیدا کن.</p></div><Button asChild><Link href="/dashboard/create-post">ساخت لابی جدید</Link></Button></Card>
        )}
      </div>
    </section>
  );
}
