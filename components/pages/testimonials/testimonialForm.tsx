"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { useAuth } from "@/app/stores/useAuth";
import { TESTIMONIAL_MAX_LENGTH, TESTIMONIAL_MIN_LENGTH, TESTIMONIAL_STATUS_LABEL } from "@/app/lib/testimonials";

interface MyTestimonial {
  id: number;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[rgba(245,158,11,0.13)] border-[#f59e0b] text-[#f59e0b]",
  APPROVED: "bg-[rgba(34,197,94,0.14)] border-[#22c55e] text-[#22c55e]",
  REJECTED: "bg-[rgba(239,68,68,0.13)] border-[#ef4444] text-[#ef4444]",
};

export function TestimonialForm() {
  const { user, status, fetchMe } = useAuth();
  const [mine, setMine] = useState<MyTestimonial | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/testimonials", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success" && json.data) {
          setMine(json.data);
          setBody(json.data.body);
        }
      })
      .finally(() => setLoading(false));
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.status !== "success") {
        setError(json.message ?? "خطایی پیش اومد.");
        return;
      }
      setMine({ id: json.data.id, body: body.trim(), status: "PENDING" });
      setNotice(json.message);
    } catch {
      setError("مشکلی در ارتباط با سرور پیش اومد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setNotice(null);
    const res = await fetch("/api/testimonials", { method: "DELETE" });
    const json = await res.json();
    if (json.status === "success") {
      setMine(null);
      setBody("");
    } else {
      setError(json.message ?? "خطایی پیش اومد.");
    }
  }

  if (status === "guest") {
    return (
      <Card noHover className="items-center gap-4 p-9 text-center">
        <p className="text-lg font-black text-text" dir="auto">
          برای ثبت نظر اول وارد حساب شو
        </p>
        <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
          نظرت با اسم و رنک پروفایلت توی صفحه اصلی نمایش داده میشه، برای همین لازمه وارد حساب باشی.
        </p>
        <Button asChild>
          <Link href="/login?next=/testimonials">ورود به حساب</Link>
        </Button>
      </Card>
    );
  }

  if (status !== "authenticated" || loading) {
    return <div className="flex h-40 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <Card noHover className="gap-6 p-9">
      {user && (
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={40} />
            <p className="text-base font-black text-text" dir="auto">
              {user.displayName}
            </p>
          </div>
          {mine && (
            <span className={`rounded-[4px] border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[mine.status]}`} dir="auto">
              {TESTIMONIAL_STATUS_LABEL[mine.status]}
            </span>
          )}
        </div>
      )}

      <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="testimonial-body">{mine ? "ویرایش نظر شما" : "نظر شما درباره دوتامیت"}</Label>
          <Textarea
            id="testimonial-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={TESTIMONIAL_MIN_LENGTH}
            maxLength={TESTIMONIAL_MAX_LENGTH}
            placeholder="مثلا: چطور هم‌تیمی پیدا کردی؟ چی توی دوتامیت بیشتر از همه به کارت اومد؟"
            className="min-h-[170px] bg-surface-alt"
            dir="auto"
          />
          <p className="text-[12px] text-text-dim" dir="auto">
            {body.trim().length.toLocaleString("fa-IR")} / {TESTIMONIAL_MAX_LENGTH.toLocaleString("fa-IR")} حرف
          </p>
        </div>

        {mine?.status === "REJECTED" && (
          <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
            نظر قبلی‌ات تایید نشد. می‌تونی ویرایشش کنی و دوباره بفرستی.
          </p>
        )}
        {mine && mine.status !== "REJECTED" && (
          <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
            هر ویرایش، نظرت رو دوباره به صف تایید می‌فرسته.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400" dir="auto">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-success" dir="auto">
            {notice}
          </p>
        )}

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          {mine ? (
            <Button type="button" variant="outline" size="sm" onClick={handleDelete}>
              حذف نظر من
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" className="px-8" disabled={submitting}>
            {submitting ? "در حال ارسال..." : mine ? "ذخیره و ارسال مجدد" : "ارسال نظر"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
