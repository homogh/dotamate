"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";
import { RANK_LABEL } from "@/components/dashboard/postLabels";

interface ConversationItem {
  conversationId: number;
  userId: number;
  displayName: string;
  rank: string;
  rankTier: number | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "دیروز";
  if (days < 7) return `${days} روز پیش`;
  return `${Math.floor(days / 7)} هفته پیش`;
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/messages", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setConversations(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter((c) => c.displayName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex w-full flex-col gap-5 p-6 md:p-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface py-2.5 pl-3 pr-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی گفتگوها..."
            dir="auto"
            className="w-[220px] bg-transparent text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
          <Search size={16} className="text-text-dim" />
        </div>
        <p className="text-[18px] font-black text-text" dir="auto">
          گفتگوهای اخیر
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <Card tone="surface" noHover className="w-full items-center gap-2 p-10 text-center">
          <p className="text-[14px] text-text-dim" dir="auto">
            {conversations.length === 0 ? "هنوز گفتگویی نداری." : "گفتگویی با این جستجو پیدا نشد."}
          </p>
        </Card>
      ) : (
        <DashboardFadeIn ready={!loading} className="w-full overflow-hidden rounded-[12px] border border-border bg-surface">
          {filtered.map((c, i) => (
            <button
              key={c.conversationId}
              onClick={() => router.push(`/dashboard/messages/${c.conversationId}`)}
              className={`flex w-full items-center gap-4 p-5 text-right transition-colors hover:bg-white/[0.04] ${
                i !== filtered.length - 1 ? "border-b border-border" : ""
              } ${c.unread ? "bg-white/[0.06]" : ""}`}
            >
              <div className="flex items-center gap-3">
                {c.unread && <div className="size-2 rounded-full bg-primary" />}
                <p className={`text-[12px] whitespace-nowrap ${c.unread ? "text-accent" : "text-text-dim"}`} dir="auto">
                  {timeAgo(c.lastMessageAt)}
                </p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-accent" dir="auto">
                    {RANK_LABEL[c.rank]} {c.rankTier ?? ""}
                  </span>
                  <p className="text-[15px] font-black text-text" dir="auto">
                    {c.displayName}
                  </p>
                </div>
                <p className={`w-full truncate text-right text-[13px] ${c.unread ? "text-text" : "text-text-dim"}`} dir="auto">
                  {c.lastMessage}
                </p>
              </div>

              <HeroAvatar name={c.displayName} size={44} round />
            </button>
          ))}
        </DashboardFadeIn>
      )}
    </div>
  );
}
