"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { HeroAvatar } from "@/components/general/heroAvatar";
import { RANK_LABEL } from "@/components/dashboard/postLabels";

interface ThreadInfo {
  id: number;
  other: { id: number; displayName: string; rank: string; rankTier: number | null };
  blocked: boolean;
  blockedByMe: boolean;
}

interface ThreadMessage {
  id: number;
  body: string;
  createdAt: string;
  senderId: number;
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;

  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(() => {
    fetch(`/api/conversations/${conversationId}`, { cache: "no-store" })
      .then((res) => {
        if (res.status === 403) setForbidden(true);
        return res.json();
      })
      .then((json) => {
        if (json.status === "success") setThread(json.data);
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  const loadMessages = useCallback(() => {
    fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setMessages(json.data);
      });
  }, [conversationId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (forbidden) return;
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages, forbidden]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    loadMessages();
  }

  async function handleBlock() {
    if (!thread) return;
    if (!confirm(`مطمئنی می‌خوای ${thread.other.displayName} رو مسدود کنی؟`)) return;
    await fetch(`/api/users/${thread.other.id}/block`, { method: "POST" });
    loadThread();
  }

  async function handleReport() {
    if (!thread) return;
    const reason = prompt("دلیل گزارش تخلف رو بنویس:");
    if (!reason) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: thread.other.id, reason }),
    });
    alert("گزارش شما ثبت شد.");
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (forbidden || !thread) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <p className="text-center text-[14px] text-text-dim" dir="auto">
          به این گفتگو دسترسی نداری.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-[80px] w-full shrink-0 items-center justify-between border-b border-border bg-bg-alt px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBlock}
            className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-bold ${
              thread.blockedByMe ? "border-border text-text-dim" : "border-red-400 text-red-400"
            }`}
            dir="auto"
          >
            {thread.blockedByMe ? "رفع مسدودیت" : "مسدود کردن"}
          </button>
          <button
            onClick={handleReport}
            className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] font-bold text-text-dim"
            dir="auto"
          >
            گزارش تخلف
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-[4px] bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-accent" dir="auto">
                {RANK_LABEL[thread.other.rank]} {thread.other.rankTier ?? ""}
              </span>
              <p className="text-[16px] font-black text-text" dir="auto">
                {thread.other.displayName}
              </p>
            </div>
          </div>
          <button onClick={() => router.push(`/dashboard/profile/${thread.other.id}`)}>
            <HeroAvatar name={thread.other.displayName} size={44} round />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 md:p-10">
        {messages.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-[13px] text-text-dim" dir="auto">
            هنوز پیامی رد و بدل نشده — سلام کن.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId !== thread.other.id;
            return (
              <div key={m.id} className={`flex w-full ${mine ? "justify-start" : "justify-end"}`}>
                <div
                  className={`flex w-[380px] max-w-[80%] flex-col gap-2 rounded-[12px] p-4 ${
                    mine ? "rounded-br-[4px] bg-primary" : "rounded-bl-[4px] border border-border bg-surface"
                  }`}
                >
                  <p className="w-full text-right text-[14px] leading-[1.6] text-text" dir="auto">
                    {m.body}
                  </p>
                  <p className="text-[10px] text-text-dim">
                    {new Date(m.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex w-full items-center gap-4 border-t border-border bg-surface p-4 md:mx-10 md:mb-10 md:w-auto md:rounded-[12px] md:border">
        <button
          onClick={handleSend}
          disabled={thread.blocked}
          className="flex items-center gap-2 rounded-[8px] bg-primary px-6 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
          dir="auto"
        >
          <Send size={16} />
          ارسال پیام
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={thread.blocked}
          placeholder={thread.blocked ? "ارسال پیام مسدود شده" : "پیام خود را بنویسید..."}
          dir="auto"
          className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-dim/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
