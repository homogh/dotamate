"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/general/card";
import { PostForm, toLocalInputValue, type PostFormValues } from "@/components/dashboard/postForm";
import type { PositionValue } from "@/components/dashboard/positionMeta";

interface EditState {
  values: PostFormValues;
  lockedPositions: string[];
  memberCount: number;
  displayName: string;
  avatarUrl: string | null;
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${id}/detail`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        const d = json.data;
        if (json.status !== "success") return setError(json.message ?? "پست پیدا نشد.");
        if (!d.isAuthor) return setError("این پست مال تو نیست.");
        if (d.status !== "ACTIVE" && d.status !== "FULL") return setError("فقط پست فعال قابل ویرایشه.");

        setState({
          values: {
            position: d.position,
            neededPositions: d.neededPositions as PositionValue[],
            rank: d.rank,
            rankTier: d.rankTier,
            gameMode: d.gameMode,
            regions: d.regions,
            sessionType: d.sessionType,
            startAt: toLocalInputValue(d.startAt),
            partySize: d.partySize,
            hasVoice: d.hasVoice,
            voiceLink: d.voiceLink ?? "",
            description: d.description,
          },
          lockedPositions: (d.neededPositions as string[]).filter((p) => !d.openPositions.includes(p)),
          memberCount: d.memberCount,
          displayName: d.author.displayName,
          avatarUrl: d.author.avatarUrl,
        });
      })
      .catch(() => setError("مشکلی در ارتباط با سرور پیش اومد."));
  }, [id]);

  if (error) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <Card tone="surface" noHover className="w-full items-center gap-3 p-10 text-center">
          <AlertTriangle size={32} className="text-danger" />
          <p className="text-[16px] font-black text-text" dir="auto">
            {error}
          </p>
          <Link
            href="/dashboard/my-posts"
            className="mt-2 rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white hover:bg-primary-hover"
          >
            رفتن به پست‌های من
          </Link>
        </Card>
      </div>
    );
  }

  if (!state) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <PostForm
        mode="edit"
        postId={Number(id)}
        initial={state.values}
        lockedPositions={state.lockedPositions}
        memberCount={state.memberCount}
        displayName={state.displayName}
        avatarUrl={state.avatarUrl}
      />
    </div>
  );
}
