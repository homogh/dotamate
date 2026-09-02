import type { Metadata } from "next";

import { PageBanner } from "@/components/general/pageBanner";
import { FaqAccordion } from "@/components/pages/faq/faqAccordion";

export const metadata: Metadata = {
  title: "سوالات متداول | دوتامیت",
  description: "پاسخ سوالات پرتکرار دربارهٔ دوتامیت، رنک تایید‌شده، چت صوتی و ساخت پارتی.",
};

export default function FaqPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="مرکز پشتیبانی و سوالات کاربران"
        title="سوالات متداول"
        subtitle="پاسخ سریع به رایج‌ترین ابهامات و پرسش‌های بازیکنان دربارهٔ روند کارکرد، قوانین و امنیت دوتامیت"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="mx-auto w-full max-w-[1000px]">
          <FaqAccordion />
        </div>
      </div>
    </div>
  );
}
