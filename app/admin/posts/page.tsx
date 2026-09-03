"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/general/card";

interface AdminPost {
  id: number;
  description: string;
  authorName: string;
  authorRank: string;
  reportCount: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "همه پست‌ها" },
  { value: "ACTIVE", label: "فعال" },
  { value: "FULL", label: "تکمیل ظرفیت" },
  { value: "COMPLETED", label: "تکمیل‌شده" },
  { value: "EXPIRED", label: "منقضی‌شده" },
];

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function AdminPostsPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return fetch(`/api/admin/posts?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setPosts(json.data);
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleForceDelete(id: number) {
    if (!confirm("مطمئنی می‌خوای این پست رو به‌صورت اجباری حذف کنی؟")) return;
    setBusyId(id);
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`rounded-[8px] px-4 py-2 text-[13px] ${
                status === o.value ? "bg-primary font-bold text-white" : "border border-border text-text-dim"
              }`}
              dir="auto"
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[14px] font-extrabold text-text" dir="auto">
          فیلتر و ترتیب لابی‌ها
        </p>
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[820px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">اقدام نظارتی</th>
                <th className="p-3 text-right font-bold">گزارش‌ها</th>
                <th className="p-3 text-right font-bold">وضعیت</th>
                <th className="p-3 text-right font-bold">تاریخ ثبت</th>
                <th className="p-3 text-right font-bold">رنک نویسنده</th>
                <th className="p-3 text-right font-bold">نویسنده</th>
                <th className="p-3 text-right font-bold">عنوان پست / لابی</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    پستی برای نمایش نیست.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id} className="border-b border-border text-[13px]">
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === p.id}
                          onClick={() => handleForceDelete(p.id)}
                          className="rounded-[6px] bg-danger px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
                          dir="auto"
                        >
                          حذف اجباری
                        </button>
                        <button
                          onClick={() => router.push(`/admin/reports?query=${encodeURIComponent(p.authorName)}`)}
                          className="rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-text"
                          dir="auto"
                        >
                          بررسی گزارش
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-text">{p.reportCount} گزارش</td>
                    <td className="p-3">
                      <span
                        className={`rounded-[4px] px-2 py-0.5 text-[11px] font-black ${
                          p.reportCount > 2 ? "bg-danger/[0.13] text-danger" : "bg-surface-alt text-text-dim"
                        }`}
                        dir="auto"
                      >
                        {p.reportCount > 2 ? "پر گزارش" : "عادی"}
                      </span>
                    </td>
                    <td className="p-3 text-text-dim">{timeAgo(p.createdAt)}</td>
                    <td className="p-3 font-bold text-accent">{p.authorRank}</td>
                    <td className="p-3 text-text-dim" dir="auto">
                      {p.authorName}
                    </td>
                    <td className="p-3 font-extrabold text-text" dir="auto">
                      {p.description.slice(0, 60)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
