"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BlogEditor } from "@/components/pages/admin/blogEditor";

export default function NewBlogPostPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Link href="/admin/blog" className="flex items-center gap-1 text-[13px] text-text-dim hover:text-text" dir="auto">
        <ChevronLeft size={14} />
        بازگشت به لیست مقالات
      </Link>
      <p className="w-full text-right text-[20px] font-black text-text" dir="auto">
        ایجاد مقاله جدید
      </p>
      <BlogEditor />
    </div>
  );
}
