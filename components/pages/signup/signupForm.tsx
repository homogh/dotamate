"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/general/authShell";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setError(null);
    // TODO: اتصال به API ثبت‌نام وقتی بک‌اند آماده شد.
  }

  return (
    <AuthShell
      title="ساخت حساب دوتامیت"
      subtitle="کمتر از یک دقیقه ثبت‌نام کن و وارد دنیای پارتی‌های هماهنگ شو."
      footer={
        <>
          قبلاً حساب ساختی؟{" "}
          <Link href="/login" className="font-bold text-accent">
            وارد شو
          </Link>
        </>
      }
    >
      <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName">نام نمایشی</Label>
          <Input id="displayName" name="displayName" required placeholder="مثلاً: آرش" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contact">ایمیل یا شماره موبایل</Label>
          <Input
            id="contact"
            name="contact"
            required
            placeholder="you@example.com"
            dir="ltr"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">رمز عبور</Label>
          <Input id="password" name="password" type="password" required dir="ltr" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            dir="ltr"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" dir="auto">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full">
          ثبت‌نام رایگان
        </Button>

        <p className="text-center text-xs leading-[1.7] text-text-dim" dir="auto">
          اتصال پروفایل استیم اختیاری‌ست و بعد از ثبت‌نام از تنظیمات حساب انجام
          می‌شه — نیازی به لاگین با استیم نیست.
        </p>
      </form>
    </AuthShell>
  );
}
