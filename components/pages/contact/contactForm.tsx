"use client";

import { useRef, useState, type FormEvent } from "react";
import { Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/general/card";
import { TICKET_PRIORITIES, TICKET_CATEGORIES } from "@/app/lib/supportTickets";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: اتصال به API ثبت تیکت پشتیبانی وقتی بک‌اند آماده شد.
    setSent(true);
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
              defaultValue={TICKET_PRIORITIES[1]}
              className="h-11 w-full rounded-[8px] border border-border bg-surface-alt px-4 text-sm text-text outline-none transition-colors focus-visible:border-primary"
              dir="auto"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">دسته‌بندی موضوعی</Label>
            <select
              id="category"
              name="category"
              defaultValue={TICKET_CATEGORIES[0]}
              className="h-11 w-full rounded-[8px] border border-border bg-surface-alt px-4 text-sm text-text outline-none transition-colors focus-visible:border-primary"
              dir="auto"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-[8px] border border-border px-4 py-2.5 text-[13px] text-text-dim transition-colors hover:border-white/20 hover:text-text"
          >
            <span dir="auto">
              {fileName ? `فایل ضمیمه: ${fileName}` : "ضمیمه کردن فایل (عکس/ویدیو)"}
            </span>
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />

          <Button type="submit" size="default" className="px-8">
            ارسال تیکت پشتیبانی
          </Button>
        </div>
      </form>
    </Card>
  );
}
