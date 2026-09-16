"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { GeneratedCover } from "@/components/general/generatedCover";
import { BLOG_CATEGORIES } from "@/app/lib/blogPosts";

interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  categories: string[];
  tags: string[];
  status: string;
  coverImageUrl: string | null;
  coverSeed: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-success/[0.13] border-success text-success",
  DRAFT: "bg-[#ff9f0a]/[0.13] border-[#ff9f0a] text-[#ff9f0a]",
  SCHEDULED: "bg-accent/[0.13] border-accent text-accent",
};

const STATUS_LABEL: Record<string, string> = { PUBLISHED: "منتشرشده", DRAFT: "پیش‌نویس", SCHEDULED: "زمان‌بندی‌شده" };

export default function AdminBlogPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id: number) {
    if (!(await confirmAction({ message: "مطمئنی می‌خوای این مقاله رو حذف کنی؟", danger: true, confirmLabel: "حذف" }))) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (res.ok) toast.success(json?.message ?? "مقاله حذف شد.");
    else toast.error(json?.message ?? "حذف مقاله با خطا مواجه شد.");
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog/new" className="rounded-[8px] bg-primary px-5 py-2.5 text-[13px] font-black text-white" dir="auto">
            + ایجاد مقاله جدید
          </Link>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text"
            dir="auto"
          >
            <option value="">دسته‌بندی: همه</option>
            {BLOG_CATEGORIES.map((c) => (
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
          <table className="w-full min-w-[900px] text-right">
            <thead>
              <tr className="bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">عملیات</th>
                <th className="p-3 text-right font-bold">تاریخ انتشار</th>
                <th className="p-3 text-right font-bold">نویسنده</th>
                <th className="p-3 text-right font-bold">تگ‌ها</th>
                <th className="p-3 text-right font-bold">دسته‌بندی</th>
                <th className="p-3 text-right font-bold">وضعیت</th>
                <th className="p-3 text-right font-bold">عنوان مقاله</th>
                <th className="p-3 text-right font-bold">کاور</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[13px] text-text-dim">
                    مقاله‌ای ثبت نشده.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id} className="border-b border-border text-[13px]">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/blog/${p.id}`} className="font-bold text-accent" dir="auto">
                          ویرایش
                        </Link>
                        <button onClick={() => handleDelete(p.id)} className="text-danger" dir="auto">
                          حذف
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-text-dim">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("fa-IR") : "—"}
                    </td>
                    <td className="p-3 font-bold text-text" dir="auto">
                      {p.authorName}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 2).map((t) => (
                          <span key={t} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent" dir="auto">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.categories.map((c) => (
                          <span key={c} className="rounded-[4px] bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-accent" dir="auto">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-[6px] border px-3 py-1 text-[12px] font-bold ${STATUS_STYLE[p.status]}`} dir="auto">
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-text" dir="auto">
                      {p.title}
                    </td>
                    <td className="p-3">
                      <div className="relative size-11 overflow-hidden rounded-[6px]">
                        {p.coverImageUrl ? (
                          <Image src={p.coverImageUrl} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                          <GeneratedCover seed={p.coverSeed ?? p.slug} className="size-11" />
                        )}
                      </div>
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
