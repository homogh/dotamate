"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Send, Copy, Check } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";
import { RANK_LABEL } from "@/components/dashboard/postLabels";

interface Detail {
  id: number;
  isAuthor: boolean;
  author: { id: number; displayName: string; avatarUrl: string | null; rank: string; rankTier: number | null };
  position: string;
  description: string;
  hasVoice: boolean;
  voiceLink: string | null;
  partySize: number;
  status: string;
  createdAt: string;
  memberCount: number;
  accepted: { memberId: number; userId: number; displayName: string; avatarUrl: string | null; rank: string; rankTier: number | null; position: string | null }[];
  pending: { memberId: number; userId: number; displayName: string; avatarUrl: string | null; rank: string; rankTier: number | null }[];
}

interface ChatMessage {
  id: number;
  body: string;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderRank: string;
  senderRankTier: number | null;
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;
  const confirmAction = useConfirm();
  const toast = useToast();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(() => {
    fetch(`/api/posts/${postId}/detail`, { cache: "no-store" })
      .then((res) => {
        if (res.status === 403) setForbidden(true);
        return res.json();
      })
      .then((json) => {
        if (json.status === "success") setDetail(json.data);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const loadMessages = useCallback(() => {
    fetch(`/api/posts/${postId}/messages`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setMessages(json.data);
      });
  }, [postId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (forbidden) return;
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages, forbidden]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await fetch(`/api/posts/${postId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    loadMessages();
  }

  async function handleAction(memberId: number, action: "accept" | "reject") {
    await fetch(`/api/posts/${postId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadDetail();
  }

  async function handleDelete() {
    if (!(await confirmAction({ message: "مطمئنی می‌خوای این پست رو حذف کنی؟", danger: true, confirmLabel: "حذف" }))) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("پست حذف شد.");
      router.push("/dashboard/my-posts");
    } else {
      const json = await res.json().catch(() => null);
      toast.error(json?.message ?? "حذف پست با خطا مواجه شد.");
    }
  }

  function handleCopyLink() {
    if (!detail?.voiceLink) return;
    navigator.clipboard.writeText(detail.voiceLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (forbidden || !detail) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <Card tone="surface" noHover className="w-full items-center gap-2 p-10 text-center">
          <p className="text-[15px] text-text-dim" dir="auto">
            به این اتاق لابی دسترسی نداری — یا باید صاحب پست باشی یا عضو پذیرفته‌شده.
          </p>
        </Card>
      </div>
    );
  }

  const readyCount = detail.memberCount;

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10 lg:flex-row-reverse">
      <div className="flex w-full flex-col gap-5 lg:w-[420px] lg:shrink-0">
        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-dim" dir="auto">
                {detail.status === "ACTIVE" || detail.status === "FULL" ? "الان" : "پایان‌یافته"}
              </span>
              <div className="size-2 rounded-full bg-success" />
            </div>
            <Link href={`/dashboard/profile/${detail.author.id}`} className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <p className="text-[16px] font-black text-text" dir="auto">
                  {detail.author.displayName}
                </p>
                <p className="text-[12px] font-bold text-accent" dir="auto">
                  میزبان لابی • {RANK_LABEL[detail.author.rank]} {detail.author.rankTier ?? ""}
                </p>
              </div>
              <UserAvatar name={detail.author.displayName} avatarUrl={detail.author.avatarUrl} size={48} round />
            </Link>
          </div>

          <p className="w-full text-right text-[15px] leading-[1.6] text-text-dim" dir="auto">
            {detail.description}
          </p>

          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center justify-between text-[13px]">
              <p className="font-bold text-accent" dir="auto">
                {readyCount} از {detail.partySize} بازیکن آماده
              </p>
              <p className="text-text-dim" dir="auto">
                ظرفیت پارتی
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(readyCount / detail.partySize) * 100}%` }} />
            </div>
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full gap-3.5 p-6">
          <p className="w-full text-right text-[15px] font-black text-text" dir="auto">
            اعضای پارتی و درخواست‌ها
          </p>
          <div className="flex w-full flex-col gap-2.5">
            <MemberRow
              badge="میزبان"
              userId={detail.author.id}
              name={detail.author.displayName}
              avatarUrl={detail.author.avatarUrl}
              rank={`${RANK_LABEL[detail.author.rank]} ${detail.author.rankTier ?? ""} • ${POSITION_LABEL[detail.position as PositionValue]}`}
            />
            {detail.accepted.map((m) => (
              <MemberRow
                key={m.memberId}
                badge="عضو پارتی"
                userId={m.userId}
                name={m.displayName}
                avatarUrl={m.avatarUrl}
                rank={`${RANK_LABEL[m.rank]} ${m.rankTier ?? ""}${m.position ? ` • ${POSITION_LABEL[m.position as PositionValue]}` : ""}`}
              />
            ))}
            {detail.isAuthor &&
              detail.pending.map((p) => (
                <MemberRow
                  key={p.memberId}
                  userId={p.userId}
                  name={p.displayName}
                  avatarUrl={p.avatarUrl}
                  rank={`${RANK_LABEL[p.rank]} ${p.rankTier ?? ""}`}
                  actions={
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(p.memberId, "reject")}
                        className="rounded-[4px] bg-danger px-3 py-1.5 text-[11px] font-bold text-white"
                        dir="auto"
                      >
                        رد درخواست
                      </button>
                      <button
                        onClick={() => handleAction(p.memberId, "accept")}
                        className="rounded-[4px] bg-success px-3 py-1.5 text-[11px] font-bold text-white"
                        dir="auto"
                      >
                        قبول درخواست
                      </button>
                    </div>
                  }
                />
              ))}
          </div>
        </Card>

        {detail.hasVoice && (
          <Card tone="surface-alt" noHover className="w-full flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              {detail.voiceLink ? (
                <>
                  <a
                    href={detail.voiceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[6px] bg-primary px-4 py-2 text-[13px] font-bold text-white"
                    dir="auto"
                  >
                    اتصال به سرور
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-2 text-[13px] text-text"
                    dir="auto"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    کپی آدرس
                  </button>
                </>
              ) : (
                <p className="text-[12px] text-text-dim" dir="auto">
                  میزبان هنوز لینک وویس اضافه نکرده.
                </p>
              )}
            </div>
            <p className="text-[13px] font-bold text-text" dir="auto">
              وویس چت این لابی
            </p>
          </Card>
        )}

        {detail.isAuthor && (
          <div className="flex w-full gap-3">
            <button
              onClick={handleDelete}
              className="flex flex-1 items-center justify-center rounded-[8px] bg-danger p-4 text-[14px] font-bold text-white"
              dir="auto"
            >
              حذف پست
            </button>
            <button
              onClick={() => router.push("/dashboard/my-posts")}
              className="flex flex-1 items-center justify-center rounded-[8px] bg-primary p-4 text-[14px] font-bold text-white"
              dir="auto"
            >
              ویرایش پست
            </button>
          </div>
        )}
      </div>

      <Card tone="surface" noHover className="flex h-[640px] w-full flex-1 flex-col gap-4 p-6">
        <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
          چت لابی
        </p>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-[13px] text-text-dim" dir="auto">
              هنوز پیامی رد و بدل نشده — اولین نفر باش.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full flex-col gap-1.5 rounded-[8px] border p-3 ${
                  m.senderId === detail.author.id && detail.isAuthor
                    ? "border-primary bg-primary/15"
                    : "border-border bg-surface-alt"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <p className="text-[11px] text-text-dim">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold text-text" dir="auto">
                      {m.senderName}
                    </p>
                    <p className="text-[11px] text-accent" dir="auto">
                      {RANK_LABEL[m.senderRank]} {m.senderRankTier ?? ""}
                    </p>
                  </div>
                </div>
                <p className="w-full text-right text-[13px] text-text-dim" dir="auto">
                  {m.body}
                </p>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex w-full items-center gap-2">
          <button
            onClick={handleSend}
            className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-white hover:bg-primary-hover"
            aria-label="ارسال"
          >
            <Send size={16} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="پیام خود را بنویسید..."
            dir="auto"
            className="flex-1 rounded-[8px] border border-border bg-surface-alt px-4 py-3 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
          />
        </div>
      </Card>
    </div>
  );
}

function MemberRow({
  badge,
  userId,
  name,
  avatarUrl,
  rank,
  actions,
}: {
  badge?: string;
  userId: number;
  name: string;
  avatarUrl?: string | null;
  rank: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt p-3">
      {actions ?? (
        <span className="rounded-[4px] bg-white/[0.08] px-2.5 py-1 text-[11px] text-text-dim" dir="auto">
          {badge}
        </span>
      )}
      <Link href={`/dashboard/profile/${userId}`} className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[14px] font-bold text-text" dir="auto">
            {name}
          </p>
          <p className="text-[11px] text-text-dim" dir="auto">
            {rank}
          </p>
        </div>
        <UserAvatar name={name} avatarUrl={avatarUrl} size={32} round />
      </Link>
    </div>
  );
}
