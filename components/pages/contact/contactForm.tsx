"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/general/card";

const SUBJECTS = [
  "سوال دربارهٔ حساب یا رنک تایید‌شده",
  "گزارش یک کاربر یا پست",
  "مشکل فنی در سایت",
  "پیشنهاد یا انتقاد",
  "همکاری و تبلیغات",
];

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: اتصال به API ارسال تیکت پشتیبانی وقتی بک‌اند آماده شد.
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <p className="text-lg font-black text-text" dir="auto">
          پیامت ارسال شد
        </p>
        <p className="text-sm leading-[1.8] text-text-dim" dir="auto">
          تیم دوتامیت معمولاً ظرف ۲۴ ساعت پاسخ می‌ده. اگه فوریه، از دیسکورد رسمی هم می‌تونی پیگیری
          کنی.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          ارسال پیام دیگر
        </Button>
      </Card>
    );
  }

  return (
    <Card noHover className="gap-6">
      <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">نام</Label>
            <Input id="name" name="name" required placeholder="نام و نام خانوادگی" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">ایمیل یا آیدی تلگرام</Label>
            <Input id="email" name="email" required placeholder="you@example.com" dir="ltr" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="subject">موضوع</Label>
          <select
            id="subject"
            name="subject"
            required
            defaultValue=""
            className="h-11 w-full rounded-[8px] border border-border bg-surface px-4 text-sm text-text outline-none transition-colors focus-visible:border-primary"
            dir="auto"
          >
            <option value="" disabled>
              یکی رو انتخاب کن
            </option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="message">پیام</Label>
          <Textarea id="message" name="message" required placeholder="پیامت رو اینجا بنویس..." />
        </div>

        <Button type="submit" className="w-full">
          ارسال پیام
        </Button>
      </form>
    </Card>
  );
}
