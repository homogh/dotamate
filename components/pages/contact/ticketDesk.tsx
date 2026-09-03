"use client";

import { useState } from "react";

import { Reveal } from "@/components/general/reveal";
import { ContactForm } from "@/components/pages/contact/contactForm";
import { RecentTickets } from "@/components/pages/contact/recentTickets";

export function TicketDesk() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex w-full flex-col gap-14">
      <div className="flex w-full flex-col gap-8">
        <Reveal className="flex w-full flex-col items-end gap-1.5">
          <h2 className="w-full text-right text-[26px] font-black text-text md:text-[28px]" dir="auto">
            ثبت تیکت پشتیبانی جدید
          </h2>
          <p className="w-full text-right text-[15px] text-[rgba(255,255,255,0.5)]" dir="auto">
            فرم زیر را پر کنید تا کارشناسان ما به سرعت درخواست شما را بررسی کنند.
          </p>
        </Reveal>
        <Reveal y={16} delay={0.1}>
          <ContactForm onCreated={() => setRefreshKey((k) => k + 1)} />
        </Reveal>
      </div>

      <div className="flex w-full flex-col gap-8">
        <Reveal className="flex w-full flex-col items-end gap-1.5">
          <h2 className="w-full text-right text-[26px] font-black text-text md:text-[28px]" dir="auto">
            تیکت‌های اخیر من
          </h2>
          <p className="w-full text-right text-[15px] text-[rgba(255,255,255,0.5)]" dir="auto">
            لیست درخواست‌ها و پاسخ‌های کارشناسان دوتامیت به شما
          </p>
        </Reveal>
        <Reveal y={16} delay={0.1}>
          <RecentTickets refreshKey={refreshKey} />
        </Reveal>
      </div>
    </div>
  );
}
