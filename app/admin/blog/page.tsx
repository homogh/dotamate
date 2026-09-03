"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/general/card";

interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  status: string;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES = ["متا", "راهنما", "آموزش", "آپدیت"];

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-success/[0.13] border-success text-success",
  DRAFT: "bg-[#ff9f0a]/[0.13] border-[#ff9f0a] text-[#ff9f0a]",
  SCHEDULED: "bg-accent/[0.13] border-accent text-accent",
};

const STATUS_LABEL: Record<string, string> = { PUBLISHED: "منتشرشده", DRAFT: "پیش‌نویس", SCHEDULED: "زمان‌بندی‌شده" };

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [body, setBody] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    return fetch(`/api/admin/blog?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setPosts(json.data);
      })
      .finally(() => setLoading(false));
  }, [categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(publishNow: boolean) {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        body,
        publishNow,
        scheduledAt: scheduleEnabled && scheduledAt ? scheduledAt : null,
      }),
    });
    setSubmitting(false);
    setTitle("");
    setBody("");
    setShowEditor(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("مطمئنی می‌خوای این مقاله رو حذف کنی؟")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEditor((v) => !v)} className="rounded-[8px] bg-primary px-5 py-2.5 text-[13px] font-black text-white" dir="auto">
            + ایجاد مقاله جدید
          </button>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text"
            dir="auto"
          >
            <option value="">دسته‌بندی: همه</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[14px] font-extrabold text-text" dir="auto">
          لیست مقالات وبلاگ
        </p>
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">عملیات</th>
                <th className="p-3 text-right font-bold">تاریخ انتشار</th>
                <th className="p-3 text-right font-bold">نویسنده</th>
                <th className="p-3 text-right font-bold">دسته‌بندی</th>
                <th className="p-3 text-right font-bold">وضعیت</th>
                <th className="p-3 text-right font-bold">عنوان مقاله</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-text-dim">
                    مقاله‌ای ثبت نشده.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id} className="border-b border-border text-[13px]">
                    <td className="p-3">
                      <button onClick={() => handleDelete(p.id)} className="text-danger" dir="auto">
                        حذف
                      </button>
                    </td>
                    <td className="p-3 text-text-dim">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("fa-IR") : "—"}
                    </td>
                    <td className="p-3 font-bold text-text" dir="auto">
                      {p.authorName}
                    </td>
                    <td className="p-3 text-accent" dir="auto">
                      {p.category}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-[6px] border px-3 py-1 text-[12px] font-bold ${STATUS_STYLE[p.status]}`} dir="auto">
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-text" dir="auto">
                      {p.title}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showEditor && (
        <Card tone="surface-alt" noHover className="w-full gap-6 p-7">
          <p className="w-full text-right text-[18px] font-black text-text" dir="auto">
            بخش ویرایشگر / ایجاد مقاله جدید
          </p>
          <div className="flex w-full flex-col gap-5 md:flex-row">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-[8px] border border-border bg-surface-alt p-3 text-[14px] text-text md:w-[220px]"
              dir="auto"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان مقاله"
              dir="auto"
              className="flex-1 rounded-[8px] border border-border bg-surface-alt p-3 text-[14px] text-text placeholder:text-text-dim/60 focus:outline-none"
            />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            placeholder="متن کامل مقاله را اینجا بنویسید..."
            dir="auto"
            className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-4 text-[14px] leading-[1.8] text-text placeholder:text-text-dim/60 focus:outline-none"
          />

          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                disabled={submitting}
                onClick={() => handleSave(false)}
                className="rounded-[8px] border border-border px-5 py-2.5 text-[13px] font-bold text-text disabled:opacity-50"
                dir="auto"
              >
                ذخیره به صورت پیش‌نویس
              </button>
              <button
                disabled={submitting}
                onClick={() => handleSave(true)}
                className="rounded-[8px] bg-primary px-6 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
                dir="auto"
              >
                انتشار نهایی
              </button>
            </div>

            <div className="flex items-center gap-3">
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-[8px] border border-border bg-surface-alt px-3 py-2 text-[13px] text-text"
                  dir="ltr"
                />
              )}
              <span className="text-[13px] text-text-dim" dir="auto">
                زمان‌بندی انتشار
              </span>
              <button
                onClick={() => setScheduleEnabled((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${scheduleEnabled ? "bg-primary" : "border border-border bg-surface-alt"}`}
              >
                <span className="absolute top-0.5 size-4 rounded-full bg-white transition-[right] duration-200" style={{ right: scheduleEnabled ? 2 : 18 }} />
              </button>
              <span className="text-[13px] text-text" dir="auto">
                انتشار فوری
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
