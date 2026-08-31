"use client";

import type { FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/general/authShell";

export function LoginForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: اتصال به API ورود وقتی بک‌اند آماده شد.
  }

  return (
    <AuthShell
      title="ورود به دوتامیت"
      subtitle="خوش برگشتی! برای دیدن لابی‌ها وارد حسابت شو."
      footer={
        <>
          هنوز حساب نساختی؟{" "}
          <Link href="/signup" className="font-bold text-accent">
            ثبت‌نام کن
          </Link>
        </>
      }
    >
      <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">رمز عبور</Label>
            <Link href="/reset-password" className="text-xs font-bold text-accent">
              رمزت رو فراموش کردی؟
            </Link>
          </div>
          <Input id="password" name="password" type="password" required dir="ltr" />
        </div>

        <Button type="submit" className="w-full">
          ورود به حساب
        </Button>
      </form>
    </AuthShell>
  );
}
