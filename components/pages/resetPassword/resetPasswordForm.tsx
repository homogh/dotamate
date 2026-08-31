"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/general/authShell";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    // TODO: درخواست لینک بازیابی از API وقتی بک‌اند آماده شد.
  }

  function handleSetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setError(null);
    // TODO: ثبت رمز جدید از طریق API وقتی بک‌اند آماده شد.
  }

  if (token) {
    return (
      <AuthShell
        title="تعیین رمز جدید"
        subtitle="یک رمز عبور جدید برای حساب دوتامیت خودت انتخاب کن."
      >
        <form className="flex w-full flex-col gap-5" onSubmit={handleSetPasswordSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">رمز عبور جدید</Label>
            <Input id="password" name="password" type="password" required dir="ltr" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
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
            ثبت رمز جدید
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="بازیابی رمز عبور"
      subtitle="ایمیل یا شماره موبایل حسابت رو وارد کن تا لینک بازیابی رمز برات ارسال بشه."
      footer={
        <>
          رمزت رو یادت اومد؟{" "}
          <Link href="/login" className="font-bold text-accent">
            وارد شو
          </Link>
        </>
      }
    >
      {sent ? (
        <p className="text-center text-sm leading-[1.8] text-text-dim" dir="auto">
          اگه این ایمیل یا شماره توی دوتامیت ثبت شده باشه، لینک بازیابی رمز
          براش ارسال می‌شه. صندوق پیامت رو چک کن.
        </p>
      ) : (
        <form className="flex w-full flex-col gap-5" onSubmit={handleRequestSubmit}>
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

          <Button type="submit" className="w-full">
            ارسال لینک بازیابی
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
