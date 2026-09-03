"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/general/authShell";
import { useAuth } from "@/app/stores/useAuth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchMe = useAuth((state) => state.fetchMe);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const contact = String(form.get("contact") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, password }),
      });
      const json = await res.json();

      if (json.status !== "success") {
        setError(json.message ?? "ورود ناموفق بود.");
        setLoading(false);
        return;
      }

      await fetchMe();
      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch {
      setError("مشکلی در ارتباط با سرور پیش اومد.");
      setLoading(false);
    }
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

        {error && (
          <p className="text-sm text-red-400" dir="auto">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "در حال ورود..." : "ورود به حساب"}
        </Button>
      </form>
    </AuthShell>
  );
}
