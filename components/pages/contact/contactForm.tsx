"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/general/card";
import { useAuth } from "@/app/stores/useAuth";
import { TICKET_PRIORITY_OPTIONS, TICKET_CATEGORY_OPTIONS } from "@/components/pages/contact/ticketLabels";

export function ContactForm({ onCreated }: { onCreated?: () => void }) {
  const { user, status, fetchMe } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: form.get("priority"),
          category: form.get("category"),
          subject: form.get("subject"),
          message: form.get("message"),
        }),
      });
      const json = await res.json();
      if (json.status !== "success") {
        setError(json.message ?? "خطایی پیش اومد.");
        setSubmitting(false);
        return;
      }
      setSent(true);
      onCreated?.();
    } catch {
      setError("مشکلی در ارتباط با سرور پیش اومد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "guest") {
    return (
      <Card noHover className="items-center gap-4 p-9 text-center">
        <p className="text-lg font-black text-text" dir="auto">
          برای ثبت تیکت پشتیبانی اول وارد حساب شو
        </p>
        <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
          این کار به ما کمک می‌کنه پاسخ کارشناسان رو مستقیم توی همین صفحه بهت نشون بدیم.
        </p>
        <Button asChild>
          <Link href="/login?next=/contact">ورود به حساب</Link>
        </Button>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card noHover className="items-center gap-4 p-9 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <p className="text-lg font-black text-text" dir="auto">
          تیکت شما ثبت شد
        </p>
        <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
          تیم پشتیبانی دوتامیت طبق زمان اعلام‌شده بررسی و پاسخ می‌ده. می‌تونی وضعیتش رو از جدول
          «تیکت‌های اخیر من» پایین همین صفحه دنبال کنی.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          ثبت تیکت دیگر
        </Button>
      </Card>
    );
  }

  return (
    <Card noHover className="gap-6 p-9">
      <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">اولویت تیکت</Label>
            <select
              id="priority"
              name="priority"
              defaultValue="MEDIUM"
              className="h-11 w-full rounded-[8px] border border-border bg-surface-alt px-4 text-sm text-text outline-none transition-colors focus-visible:border-primary"
              dir="auto"
            >
              {TICKET_PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">دسته‌بندی موضوعی</Label>
            <select
              id="category"
              name="category"
              defaultValue="TECHNICAL"
              className="h-11 w-full rounded-[8px] border border-border bg-surface-alt px-4 text-sm text-text outline-none transition-colors focus-visible:border-primary"
              dir="auto"
            >
              {TICKET_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">موضوع تیکت</Label>
            <Input id="subject" name="subject" required placeholder="عنوان تیکت خود را بنویسید..." />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="message">متن پیام پشتیبانی</Label>
          <Textarea
            id="message"
            name="message"
            required
            placeholder="توضیحات کامل مشکل یا سوال خود را در اینجا بنویسید..."
            className="min-h-[150px] bg-surface-alt"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" dir="auto">
            {error}
          </p>
        )}

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-text-dim" dir="auto">
            {user ? `ثبت‌کننده: ${user.displayName}` : ""}
          </p>
          <Button type="submit" size="default" className="px-8" disabled={submitting}>
            {submitting ? "در حال ارسال..." : "ارسال تیکت پشتیبانی"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
