"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { Card } from "@/components/general/card";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";
import { POSITION_LABEL } from "@/components/dashboard/positionMeta";

type Tab = "active" | "completed" | "expired";

const TAB_LABEL: Record<Tab, string> = { active: "فعال", completed: "تکمیل‌شده", expired: "منقضی‌شده" };
const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "فعال",
  FULL: "تکمیل ظرفیت",
  COMPLETED: "تکمیل‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغو شده",
};

interface MyPost {
  id: number;
  position: string;
  rank: string;
  region: string;
  status: string;
  description: string;
  hasVoice: boolean;
  partySize: number;
  createdAt: string;
  filledPositions: string[];
  memberCount: number;
  pendingCount: number;
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function MyPostsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, completed: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch(`/api/dashboard/my-posts?tab=${tab}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setPosts(json.data.posts);
          setCounts(json.data.counts);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number) {
    if (!confirm("مطمئنی می‌خوای این پست رو حذف کنی؟")) return;
    setBusyId(id);
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  async function handleSaveEdit(id: number) {
    setBusyId(id);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editDescription }),
    });
    setBusyId(null);
    setEditingId(null);
    load();
  }

  async function handleRepublish(id: number) {
    setBusyId(id);
    const res = await fetch(`/api/posts/${id}/republish`, { method: "POST" });
    const json = await res.json();
    setBusyId(null);
    if (json.status === "success") {
      setTab("active");
    } else {
      alert(json.message);
    }
  }

  const activePost = tab === "active" ? posts.find((p) => p.status === "ACTIVE" || p.status === "FULL") : null;
  const historyPosts = tab !== "active" ? posts : [];

  return (
    <div className="flex w-full flex-col gap-7 p-6 md:p-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard/create-post"
          className="rounded-[8px] bg-primary px-5 py-2.5 text-[14px] font-bold text-white hover:bg-primary-hover"
          dir="auto"
        >
          ایجاد لابی جدید
        </Link>

        <div className="flex items-center gap-1 rounded-[8px] bg-surface-alt p-1">
          {(["expired", "completed", "active"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[6px] px-4 py-2 text-[14px] transition-colors ${
                tab === t ? "bg-surface font-bold text-accent" : "text-text-dim hover:text-text"
              }`}
              dir="auto"
            >
              {TAB_LABEL[t]} ({counts[t]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : counts.total === 0 ? (
        <EmptyState />
      ) : (
        <DashboardFadeIn ready={!loading} className="flex w-full flex-col gap-7">
          {tab === "active" && (
            <div className="flex w-full flex-col gap-4">
              <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                پست فعال در لابی
              </p>
              {activePost ? (
                <Card tone="surface" noHover className="w-full gap-5 p-6">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(activePost.id)}
                        disabled={busyId === activePost.id}
                        className="rounded-[8px] border border-border bg-surface-alt px-4 py-2 text-[13px] font-bold text-text-dim hover:text-text disabled:opacity-50"
                      >
                        حذف
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(editingId === activePost.id ? null : activePost.id);
                          setEditDescription(activePost.description);
                        }}
                        className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-primary-hover"
                      >
                        ویرایش
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[16px] font-black text-text" dir="auto">
                          {activePost.description}
                        </p>
                        <p className="text-[13px] text-text-dim" dir="auto">
                          ثبت شده در: {timeAgo(activePost.createdAt)}
                        </p>
                      </div>
                      <div className="size-2 shrink-0 rounded-full bg-success" />
                    </div>
                  </div>

                  {editingId === activePost.id && (
                    <div className="flex w-full flex-col items-end gap-3 rounded-[8px] bg-surface-alt p-4">
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        dir="auto"
                        className="w-full resize-none rounded-[8px] border border-border bg-bg-alt p-3 text-[13px] text-text focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(activePost.id)}
                          disabled={busyId === activePost.id}
                          className="rounded-[6px] bg-primary px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                        >
                          ذخیره
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-dim"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="h-px w-full bg-border" />

                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <p className="text-[13px] text-text-dim" dir="auto">
                        اعضای لابی:
                      </p>
                      <div className="flex gap-1">
                        {Array.from({ length: activePost.partySize }).map((_, i) => (
                          <div
                            key={i}
                            className={`size-[10px] rounded-full ${i < activePost.memberCount ? "bg-accent" : "bg-white/10"}`}
                          />
                        ))}
                      </div>
                      <p className="text-[13px] font-bold text-accent" dir="auto">
                        {activePost.memberCount}/{activePost.partySize} نفر
                      </p>
                      {activePost.pendingCount > 0 && (
                        <Link href={`/dashboard/post/${activePost.id}`} className="text-[12px] font-bold text-accent" dir="auto">
                          {activePost.pendingCount} درخواست در انتظار ←
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] text-text-dim" dir="auto">
                        پوزیشن‌های خالی:
                      </p>
                      {(Object.keys(POSITION_LABEL) as (keyof typeof POSITION_LABEL)[])
                        .filter((p) => p !== activePost.position && !activePost.filledPositions.includes(p))
                        .map((p) => (
                          <span key={p} className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-[11px] font-bold text-accent">
                            {POSITION_LABEL[p].split(" - ")[0]}
                          </span>
                        ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card tone="surface" noHover className="w-full items-center gap-3 p-8 text-center">
                  <p className="text-[14px] text-text-dim" dir="auto">
                    پست فعالی نداری.
                  </p>
                  <Link href="/dashboard/create-post" className="rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white">
                    ایجاد پست جدید
                  </Link>
                </Card>
              )}
            </div>
          )}

          {tab !== "active" && (
            <div className="flex w-full flex-col gap-4">
              <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
                تاریخچه و آرشیو پست‌ها
              </p>
              {historyPosts.length === 0 ? (
                <Card tone="surface" noHover className="w-full items-center gap-2 p-8 text-center">
                  <p className="text-[13px] text-text-dim" dir="auto">
                    پستی در این دسته نیست.
                  </p>
                </Card>
              ) : (
                <div className="flex w-full flex-col gap-3">
                  {historyPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt p-4 opacity-60 transition-opacity hover:opacity-100"
                    >
                      <button
                        onClick={() => handleRepublish(post.id)}
                        disabled={busyId === post.id}
                        className="rounded-[6px] border border-border px-4 py-1.5 text-[12px] font-bold text-text disabled:opacity-50"
                        dir="auto"
                      >
                        انتشار مجدد
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-[4px] bg-primary px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                            {STATUS_BADGE[post.status]}
                          </span>
                          <p className="text-[14px] font-bold text-text" dir="auto">
                            {post.description.slice(0, 48)}
                          </p>
                        </div>
                        <p className="text-[12px] text-text-dim" dir="auto">
                          تاریخ انتشار:{" "}
                          {new Date(post.createdAt).toLocaleDateString("fa-IR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DashboardFadeIn>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card tone="surface-alt" noHover className="w-full items-center gap-4 p-10 text-center">
      <div className="flex size-[60px] items-center justify-center rounded-full bg-bg-alt">
        <PlusCircle size={24} className="text-accent" />
      </div>
      <p className="text-[16px] font-bold text-text" dir="auto">
        هنوز هیچ تیمی نداری؟
      </p>
      <p className="w-full max-w-[400px] text-[13px] text-text-dim" dir="auto">
        همین حالا اولین پست خودت رو منتشر کن تا بقیه بازیکن‌ها بتونن مستقیم به پارتیت ملحق بشن.
      </p>
      <Link href="/dashboard/create-post" className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-bold text-white">
        ایجاد اولین پست لابی
      </Link>
    </Card>
  );
}
