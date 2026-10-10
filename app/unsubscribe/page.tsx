import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailX } from "lucide-react";

import { verifyUnsubscribeToken } from "@/app/lib/emailUnsubscribe";

export const metadata: Metadata = {
  title: "لغو دریافت ایمیل | دوتامیت",
  robots: { index: false },
};

export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const params = await searchParams;
  const userId = Number(params.u);
  const token = typeof params.t === "string" ? params.t : "";
  const valid = Number.isInteger(userId) && userId > 0 && verifyUnsubscribeToken(userId, token);
  const done = params.done === "1";

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      {!valid ? (
        <>
          <MailX size={44} className="text-danger" />
          <h1 className="text-[26px] font-black text-text" dir="auto">
            این لینک نامعتبره
          </h1>
          <p className="max-w-[480px] text-[15px] leading-[1.9] text-text-dim" dir="auto">
            لینک لغو اشتراک کامل کپی نشده یا خراب شده. می‌تونی از تنظیمات داشبورد هم اعلان ایمیلی رو خاموش کنی.
          </p>
        </>
      ) : done ? (
        <>
          <MailCheck size={44} className="text-success" />
          <h1 className="text-[26px] font-black text-text" dir="auto">
            دیگه ایمیل اطلاع‌رسانی نمی‌گیری
          </h1>
          <p className="max-w-[480px] text-[15px] leading-[1.9] text-text-dim" dir="auto">
            ایمیل‌های امنیتی (مثل بازیابی رمز) همچنان میان. هر وقت خواستی می‌تونی از تنظیمات داشبورد دوباره روشنش کنی.
          </p>
          <Link href="/" className="rounded-[8px] border border-border px-6 py-3 text-[14px] font-bold text-text">
            برگشت به دوتامیت
          </Link>
        </>
      ) : (
        <>
          <MailX size={44} className="text-accent" />
          <h1 className="text-[26px] font-black text-text" dir="auto">
            لغو دریافت ایمیل‌های دوتامیت
          </h1>
          <p className="max-w-[480px] text-[15px] leading-[1.9] text-text-dim" dir="auto">
            بعد از تایید، یادآوری‌ها و ایمیل‌های اطلاع‌رسانی برات ارسال نمی‌شن. ایمیل‌های امنیتی (مثل بازیابی رمز) همچنان میان.
          </p>
          <form method="post" action={`/api/email/unsubscribe?u=${userId}&t=${token}`}>
            <button type="submit" className="rounded-[8px] bg-primary px-6 py-3 text-[14px] font-bold text-white hover:bg-primary-hover">
              لغو دریافت ایمیل‌ها
            </button>
          </form>
        </>
      )}
    </div>
  );
}
