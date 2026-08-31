"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const FAQ_ITEMS = [
  {
    question: "دوتامیت دقیقاً چیه؟",
    answer:
      "دوتامیت یه پلتفرم فارسی و رایگانه برای پیدا کردن هم‌تیمی توی Dota 2. به‌جای این‌که توی چت دوتا یا سرورهای دیسکورد دنبال آدم بگردی، اینجا رنک، رول و منطقه‌ات رو مشخص می‌کنی و با پلیرهای واقعی متناسب باهات وصل می‌شی.",
  },
  {
    question: "استفاده از دوتامیت پولیه؟",
    answer: "نه، دوتامیت کاملاً رایگانه و نیازی به کارت اعتباری نداره.",
  },
  {
    question: "باید حتماً با استیم وارد بشم؟",
    answer:
      "نه. ثبت‌نام و ورود با ایمیل یا شماره موبایل انجام می‌شه. اتصال پروفایل استیم اختیاریه و از تنظیمات حساب انجام می‌شه — فقط برای این‌که بقیه بتونن رنکت رو تایید‌شده ببینن.",
  },
  {
    question: "فرق رنک «خوداظهاری» و «تایید‌شده» چیه؟",
    answer:
      "اگه پروفایل استیمت رو وصل نکرده باشی، رنکی که وارد می‌کنی به‌صورت خوداظهاری نمایش داده می‌شه. بعد از اتصال لینک پروفایل استیم، دوتامیت آمار واقعی رنک و بازی‌هات رو می‌کشه و بج «تایید‌شده» بهت می‌ده.",
  },
  {
    question: "چت صوتی چطور کار می‌کنه؟",
    answer:
      "هر پارتی به یه سرور تیم‌اسپیک اختصاصی دوتامیت وصله. با پیوستن به پارتی، آدرس سرور و دکمهٔ اتصال مستقیم رو می‌بینی — نیازی به هماهنگی جدا نیست.",
  },
  {
    question: "چطور پارتی بسازم یا بهش ملحق بشم؟",
    answer:
      "از صفحهٔ «ایجاد پست» رنک، رول، حالت بازی و منطقه‌ات رو مشخص کن و پستت منتشر می‌شه. برای ملحق‌شدن هم کافیه از «جستجوی لابی» پارتی مناسب رو پیدا کنی و درخواست عضویت بدی.",
  },
  {
    question: "اگه با یکی مشکل پیدا کردم چیکار کنم؟",
    answer:
      "از منوی کنار هر پست، کامنت یا کاربر می‌تونی گزارش بدی یا اون شخص رو بلاک کنی. تیم دوتامیت گزارش‌ها رو بررسی و در صورت لزوم برخورد می‌کنه.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex w-full flex-col gap-3">
      {FAQ_ITEMS.map((item, index) => (
        <FaqItem
          key={item.question}
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
  question,
  answer,
  open,
  onToggle,
}: {
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
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
        aria-expanded={open}
      >
        <span className="text-base font-black text-text" dir="auto">
          {question}
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-text-dim transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div ref={contentRef} className="h-0 overflow-hidden opacity-0">
        <p className="px-6 pb-5 text-right text-sm leading-[1.8] text-text-dim" dir="auto">
          {answer}
        </p>
      </div>
    </div>
  );
}
