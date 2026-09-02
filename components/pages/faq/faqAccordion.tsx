"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const FAQ_ITEMS = [
  {
    question: "دوتامیت چیه؟",
    answer:
      "دوتامیت یک پلتفرم تخصصی و رایگان ایرانی برای بازی محبوب Dota 2 است. این پلتفرم به بازیکنان کمک می‌کند تا بر اساس سطح مهارت، رنک دقیق، ریجن و موقعیت بازی خود، هم‌تیمی‌های باانگیزه و مناسب پیدا کنند و از مشکلات بازی‌های تک‌نفره رهایی یابند.",
  },
  {
    question: "آیا استفاده از خدمات دوتامیت رایگانه؟",
    answer:
      "بله، تمامی بخش‌های اصلی دوتامیت از جمله ثبت نام، جستجوی لابی، اتصال اکانت استیم و ثبت درخواست هم‌تیمی کاملاً رایگان است و رایگان باقی خواهد ماند.",
  },
  {
    question: "چطوری می‌تونم هم‌تیمی پیدا کنم؟",
    answer:
      "بسیار ساده! پس از ثبت نام و متصل کردن اکانت استیم، می‌توانید لیست لابی‌های فعال دیگر بازیکنان را مشاهده کرده و برای آن‌ها درخواست ارسال کنید، یا خودتان یک پست جدید ایجاد کنید تا دیگران به شما ملحق شوند.",
  },
  {
    question: "تایید رنک استیم چطوری کار می‌کنه؟",
    answer:
      "دوتامیت با استفاده از API رسمی استیم به صورت مستقیم اطلاعات عمومی پروفایل دوتا ۲ شما (شامل مدال و رنک) را دریافت می‌کند. این کار به صورت خودکار و ایمن انجام می‌شود و از جعل رنک یا ادعای دروغین جلوگیری می‌کند.",
  },
  {
    question: "اگه کسی در بازی بد رفتاری کرد یا سمی بود چیکار کنم؟",
    answer:
      "شما می‌توانید پس از پایان بازی، از طریق سیستم گزارش داخلی دوتامیت، بازیکنان متخلف و سمی را ریپورت کنید. بررسی‌های دقیق توسط پشتیبانی انجام شده و با کاربران خاطی برخورد جدی (از جمله مسدودسازی موقت یا دائم) صورت خواهد گرفت.",
  },
  {
    question: "آیا برای استفاده نیاز به اکانت استیم دارم؟",
    answer:
      "بله، برای تایید هویت و نمایش رنک واقعی شما، اتصال اکانت استیمی که با آن Dota 2 بازی می‌کنید الزامی است. این فرایند کاملاً امن است و مستقیماً از طریق درگاه رسمی لاگین استیم انجام می‌شود.",
  },
  {
    question: "چطوری می‌تونم یک پست یا لابی جدید ثبت کنم؟",
    answer:
      "پس از ورود به پنل کاربری، روی گزینه «ایجاد لابی جدید» کلیک کنید. در این بخش موقعیت بازی مدنظر (مثل کری، ساپورت)، ریجن سرور، توضیحات دلخواه و فعال بودن وویس چت دیسکورد را مشخص کنید و پست خود را منتشر نمایید.",
  },
  {
    question: "آیا امکان زمان‌بندی جلسات بازی برای آینده وجود داره؟",
    answer:
      "بله، شما می‌توانید هنگام ساخت لابی، زمان دقیق شروع بازی را برای ساعات آینده یا روزهای بعد تنظیم کنید تا هم‌تیمی‌های شما از قبل برنامه‌ریزی کنند و راس ساعت هماهنگ‌شده آنلاین شوند.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex w-full flex-col gap-5">
      {FAQ_ITEMS.map((item, index) => (
        <FaqItem
          key={item.question}
          index={index + 1}
          question={item.question}
          answer={item.answer}
          open={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}

function FaqItem({
  index,
  question,
  answer,
  open,
  onToggle,
}: {
  index: number;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!contentRef.current) return;
      gsap.to(contentRef.current, {
        height: open ? "auto" : 0,
        autoAlpha: open ? 1 : 0,
        duration: 0.35,
        ease: "power2.inOut",
      });
    },
    { dependencies: [open], scope: contentRef }
  );

  return (
    <div className="w-full rounded-[12px] border border-border bg-surface-alt p-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-right"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-primary/[0.13] text-sm font-black text-accent">
            {index}
          </span>
          <span className="text-lg font-black text-text" dir="auto">
            {question}
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-text-dim transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div ref={contentRef} className="h-0 overflow-hidden opacity-0">
        <p className="pt-4 text-right text-sm leading-[1.8] text-text-dim" dir="auto">
          {answer}
        </p>
      </div>
    </div>
  );
}
