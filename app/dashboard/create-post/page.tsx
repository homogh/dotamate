"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/general/card";
import { PostForm } from "@/components/dashboard/postForm";

export default function CreatePostPage() {
  const [checkingActive, setCheckingActive] = useState(true);
  const [hasActivePost, setHasActivePost] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/home", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setHasActivePost(json.data.activePostCount > 0);
          setDisplayName(json.data.user.displayName);
          setAvatarUrl(json.data.user.avatarUrl);
        }
      })
      .finally(() => setCheckingActive(false));
  }, []);

  if (checkingActive) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (hasActivePost) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <Card tone="surface" noHover className="w-full items-center gap-3 p-10 text-center">
          <AlertTriangle size={32} className="text-danger" />
          <p className="text-[16px] font-black text-text" dir="auto">
            فقط یک پست فعال می‌تونی داشته باشی
          </p>
          <p className="text-[13px] text-text-dim" dir="auto">
            برای ساختن پست جدید، اول پست فعلیت رو ببند یا کامل کن.
          </p>
          <a
            href="/dashboard/my-posts"
            className="mt-2 rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white hover:bg-primary-hover"
          >
            رفتن به پست‌های من
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] bg-danger-soft px-6 py-3">
        <AlertTriangle size={16} className="shrink-0 text-[#ffa1a1]" />
        <p className="text-[13px] font-bold text-[#ffa1a1]" dir="auto">
          فقط یک پست فعال می‌تونی داشته باشی
        </p>
      </div>

      <PostForm mode="create" displayName={displayName} avatarUrl={avatarUrl} />
    </div>
  );
}
