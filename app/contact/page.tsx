import type { Metadata } from "next";

import { PageBanner } from "@/components/general/pageBanner";
import { Reveal } from "@/components/general/reveal";
import { Card } from "@/components/general/card";
import { IconBadge } from "@/components/general/iconBadge";
import { ContactForm } from "@/components/pages/contact/contactForm";

export const metadata: Metadata = {
  title: "ارتباط با ما | دوتامیت",
  description: "سوال، گزارش یا پیشنهادی داری؟ تیم دوتامیت رو از همین‌جا در جریان بذار.",
};

const CHANNELS = [
  {
    icon: "mic",
    title: "دیسکورد رسمی",
    desc: "سریع‌ترین راه برای پاسخ — تیم دوتامیت و کامیونیتی همیشه آنلاینن.",
    href: "#",
  },
  {
    icon: "globe",
    title: "تلگرام دوتامیت",
    desc: "اخبار، آپدیت پچ‌ها و اطلاع‌رسانی‌های سریع.",
    href: "#",
  },
];

export default function ContactPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="پشتیبانی"
        title="ارتباط با ما"
        subtitle="سوال، گزارش یا پیشنهادی داری؟ فرم زیر رو پر کن یا از کانال‌های رسمی بهمون پیام بده."
      />

      <div className="flex w-full flex-col-reverse gap-8 px-6 py-14 md:flex-row md:px-[100px] md:py-20">
        <Reveal className="flex w-full flex-col gap-4 md:w-[340px] md:shrink-0" y={16}>
          {CHANNELS.map((c) => (
            <Card key={c.title} tone="surface-alt" className="flex-row items-center gap-4 text-right">
              <div className="flex flex-1 flex-col items-end gap-1">
                <p className="text-sm font-black text-text" dir="auto">
                  {c.title}
                </p>
                <p className="text-xs leading-[1.7] text-text-dim" dir="auto">
                  {c.desc}
                </p>
              </div>
              <IconBadge src={`/images/landing/${c.icon}.svg`} size={20} />
            </Card>
          ))}

          <Card tone="surface-alt" className="gap-2">
            <p className="w-full text-right text-sm font-black text-text" dir="auto">
              زمان پاسخ‌گویی
            </p>
            <p className="w-full text-right text-xs leading-[1.8] text-text-dim" dir="auto">
              معمولاً ظرف ۲۴ ساعت پاسخ می‌دیم. برای گزارش‌های فوری (رفتار سمی یا مشکل امنیتی)،
              دیسکورد رسمی سریع‌تره.
            </p>
          </Card>
        </Reveal>

        <Reveal className="w-full flex-1" y={16} delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </div>
  );
}
