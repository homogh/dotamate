"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const QUICK_LINKS = [
  { label: "قوانین پلتفرم", href: "/terms" },
  { label: "سوالات متداول", href: "/faq" },
  { label: "حریم خصوصی", href: "/privacy" },
];

const SUPPORT_LINKS = [
  { label: "ارتباط با ما", href: "/contact" },
  { label: "تلگرام دوتامیت", href: "#" },
  { label: "دیسکورد رسمی", href: "#" },
];

const SOCIAL_ICONS = ["telegram", "discord", "steam"];

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="flex w-full flex-col items-start gap-16 border-t border-border bg-bg-alt px-6 pb-10 pt-20 md:px-[100px]">
      <div className="flex w-full flex-col items-start justify-between gap-10 md:flex-row">
        <div className="flex gap-16">
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm font-black text-text" dir="auto">
              دسترسی سریع
            </p>
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-text-dim transition-colors hover:text-text"
                dir="auto"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm font-black text-text" dir="auto">
              پشتیبانی
            </p>
            {SUPPORT_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-text-dim transition-colors hover:text-text"
                dir="auto"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col items-start gap-4 md:w-[400px] md:items-end">
          <div className="flex items-center gap-3">
            <p className="text-[22px] font-black text-text" dir="auto">
              دوتامیت
            </p>
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-primary">
              <Image
                src="/images/landing/shield-check.svg"
                alt=""
                width={20}
                height={20}
              />
            </div>
          </div>
          <p
            className="w-full text-right text-sm leading-[1.7] text-text-dim md:text-right"
            dir="auto"
          >
            دوتامیت پلتفرمی بومی و ایرانی برای نجات بازیکنان دوتا ۲ از جهنم
            سولو کیو است. هم‌تیمی‌های باانگیزه پیدا کنید و حرفه‌ای‌تر بازی
            کنید.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-6 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <div className="flex items-start gap-4">
          {SOCIAL_ICONS.map((icon) => (
            <Image
              key={icon}
              src="/images/landing/social-placeholder.svg"
              alt={icon}
              width={20}
              height={20}
            />
          ))}
        </div>
        <p className="text-xs text-text-dim" dir="auto">
          © ۱۴۰۵ دوتامیت. تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}
