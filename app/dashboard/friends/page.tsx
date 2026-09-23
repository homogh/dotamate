"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, MessageSquare, Search, UserMinus, Users, X } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { UserAvatar } from "@/components/general/userAvatar";
import { RANK_LABEL } from "@/components/dashboard/postLabels";
import { MessageThread } from "@/components/pages/messages/messageThread";

interface FriendItem {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  behaviorScore: number;
  online: boolean;
  lastActiveAt: string | null;
}

interface RequestItem extends FriendItem {
  requestId: number;
  createdAt: string;
}

function lastSeenLabel(friend: FriendItem) {
  if (friend.online) return "آنلاین";
  if (!friend.lastActiveAt) return "آفلاین";
  const minutes = Math.floor((Date.now() - new Date(friend.lastActiveAt).getTime()) / 60000);
  if (minutes < 60) return `آخرین بازدید ${Math.max(1, minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `آخرین بازدید ${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "آخرین بازدید دیروز" : `آخرین بازدید ${days} روز پیش`;
}

function FriendAvatar({ friend, size }: { friend: FriendItem; size: number }) {
  return (
    <div className="relative shrink-0">
      <UserAvatar name={friend.displayName} avatarUrl={friend.avatarUrl} size={size} round />
      <span
        className={`absolute bottom-0 left-0 size-3 rounded-full border-2 border-surface-alt ${friend.online ? "bg-success" : "bg-white/20"}`}
      />
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = Number(searchParams.get("user")) || null;
  const toast = useToast();
  const confirmAction = useConfirm();

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incoming, setIncoming] = useState<RequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  // Keyed by friend so a stale conversation never shows under a newly picked one.
  const [conversation, setConversation] = useState<{ userId: number; id: number } | null>(null);
  const conversationId = conversation && conversation.userId === selectedUserId ? conversation.id : null;

  const load = useCallback(() => {
    return fetch("/api/friends", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setFriends(json.data.friends);
          setIncoming(json.data.incoming);
          setOutgoing(json.data.outgoing);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Keeps the online dots fresh while the page stays open.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.status === "success") setConversation({ userId: selectedUserId, id: json.data.id });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  function selectFriend(userId: number | null) {
    router.replace(userId ? `/dashboard/friends?user=${userId}` : "/dashboard/friends", { scroll: false });
  }

  async function handleAnswer(request: RequestItem, action: "accept" | "decline") {
    setBusyId(request.requestId);
    const res = await fetch(`/api/friends/requests/${request.requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  async function handleCancel(request: RequestItem) {
    setBusyId(request.requestId);
    const res = await fetch(`/api/friends/requests/${request.requestId}`, { method: "DELETE" });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") toast.success(json.message);
    load();
  }

  async function handleUnfriend(friend: FriendItem) {
    if (
      !(await confirmAction({
        message: `مطمئنی می‌خوای ${friend.displayName} رو از دوستانت حذف کنی؟`,
        danger: true,
        confirmLabel: "حذف دوست",
      }))
    )
      return;
    const res = await fetch(`/api/friends/${friend.userId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    if (selectedUserId === friend.userId) selectFriend(null);
    load();
  }

  const filtered = friends.filter((f) => f.displayName.toLowerCase().includes(query.toLowerCase()));
  const selectedFriend = friends.find((f) => f.userId === selectedUserId) ?? null;
  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <div className="flex h-[calc(100dvh-80px)] w-full">
      <aside
        className={`h-full w-full shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-alt lg:flex lg:w-[340px] ${
          selectedUserId ? "hidden" : "flex"
        }`}
      >
        <div className="flex w-full flex-col gap-4 border-b border-border p-5">
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-success" dir="auto">
              {onlineCount} آنلاین
            </span>
            <p className="text-[18px] font-black text-text" dir="auto">
              دوستان ({friends.length})
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface py-2 pl-3 pr-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی دوستان..."
              dir="auto"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
            />
            <Search size={16} className="shrink-0 text-text-dim" />
          </div>
        </div>

        {incoming.length > 0 && (
          <div className="flex w-full flex-col gap-3 border-b border-border p-5">
            <p className="text-right text-[13px] font-bold text-accent" dir="auto">
              درخواست‌های دوستی ({incoming.length})
            </p>
            {incoming.map((r) => (
              <div key={r.requestId} className="flex w-full items-center gap-3">
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleAnswer(r, "decline")}
                    disabled={busyId === r.requestId}
                    className="flex size-8 items-center justify-center rounded-[8px] border border-border text-text-dim hover:text-text disabled:opacity-50"
                    aria-label="رد کردن"
                    title="رد کردن"
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => handleAnswer(r, "accept")}
                    disabled={busyId === r.requestId}
                    className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-white disabled:opacity-50"
                    aria-label="قبول کردن"
                    title="قبول کردن"
                  >
                    <Check size={15} />
                  </button>
                </div>
                <Link href={`/dashboard/profile/${r.userId}`} className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <div className="flex min-w-0 flex-col items-end gap-0.5">
                    <p className="truncate text-[14px] font-bold text-text" dir="auto">
                      {r.displayName}
                    </p>
                    <p className="text-[11px] text-text-dim" dir="auto">
                      {RANK_LABEL[r.rank]} {r.rankTier ?? ""}
                    </p>
                  </div>
                  <UserAvatar name={r.displayName} avatarUrl={r.avatarUrl} size={38} round />
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full flex-1 flex-col">
          {loading ? (
            <p className="p-8 text-center text-[13px] text-text-dim">در حال بارگذاری...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <Users size={28} className="text-text-dim" />
              <p className="text-[13px] leading-[1.7] text-text-dim" dir="auto">
                {friends.length === 0 ? "هنوز دوستی نداری — از صفحه پلیرها بازیکن‌ها رو پیدا کن و درخواست دوستی بفرست." : "دوستی با این اسم پیدا نشد."}
              </p>
              {friends.length === 0 && (
                <Link href="/players" className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-bold text-white" dir="auto">
                  رفتن به صفحه پلیرها
                </Link>
              )}
            </div>
          ) : (
            filtered.map((f) => {
              const active = f.userId === selectedUserId;
              return (
                <button
                  key={f.userId}
                  onClick={() => selectFriend(f.userId)}
                  className={`flex w-full items-center gap-3 border-b border-border/60 px-5 py-3.5 text-right transition-colors ${
                    active ? "bg-primary/15" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <MessageSquare size={15} className={active ? "text-accent" : "text-text-dim/50"} />
                  <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
                    <p className="w-full truncate text-right text-[14px] font-bold text-text" dir="auto">
                      {f.displayName}
                    </p>
                    <p className={`text-[11px] ${f.online ? "text-success" : "text-text-dim"}`} dir="auto">
                      {lastSeenLabel(f)}
                    </p>
                  </div>
                  <FriendAvatar friend={f} size={42} />
                </button>
              );
            })
          )}
        </div>

        {outgoing.length > 0 && (
          <div className="flex w-full flex-col gap-3 border-t border-border p-5">
            <p className="text-right text-[12px] font-bold text-text-dim" dir="auto">
              در انتظار پاسخ ({outgoing.length})
            </p>
            {outgoing.map((r) => (
              <div key={r.requestId} className="flex w-full items-center gap-3">
                <button
                  onClick={() => handleCancel(r)}
                  disabled={busyId === r.requestId}
                  className="shrink-0 rounded-[6px] border border-border px-2.5 py-1 text-[11px] font-bold text-text-dim hover:text-text disabled:opacity-50"
                  dir="auto"
                >
                  لغو
                </button>
                <Link href={`/dashboard/profile/${r.userId}`} className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                  <p className="truncate text-[13px] text-text" dir="auto">
                    {r.displayName}
                  </p>
                  <UserAvatar name={r.displayName} avatarUrl={r.avatarUrl} size={30} round />
                </Link>
              </div>
            ))}
          </div>
        )}
      </aside>

      <section className={`h-full min-w-0 flex-1 flex-col ${selectedUserId ? "flex" : "hidden lg:flex"}`}>
        {selectedUserId ? (
          <>
            <div className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-alt px-4 py-2 sm:px-6">
              {selectedFriend ? (
                <button
                  onClick={() => handleUnfriend(selectedFriend)}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-text-dim hover:text-danger"
                  dir="auto"
                >
                  <UserMinus size={14} />
                  حذف از دوستان
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => selectFriend(null)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-text-dim hover:text-text lg:hidden"
                dir="auto"
              >
                لیست دوستان
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {conversationId ? (
                <MessageThread key={conversationId} conversationId={conversationId} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-surface-alt">
              <MessageSquare size={24} className="text-accent" />
            </div>
            <p className="text-[16px] font-black text-text" dir="auto">
              یک دوست رو انتخاب کن
            </p>
            <p className="max-w-[320px] text-[13px] leading-[1.7] text-text-dim" dir="auto">
              روی اسم هر کدوم از دوستات بزنی، گفتگوت باهاش همین‌جا باز می‌شه.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
