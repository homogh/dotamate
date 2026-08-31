import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/general/card";
import { SectionHeading } from "@/components/general/sectionHeading";
import { Reveal } from "@/components/general/reveal";

const TAGS = [
  { label: "دیسکورد فعال", accent: false },
  { label: "ریجن: اروپا شرقی", accent: false },
  { label: "پوزیشن ۳ و ۵", accent: true },
];
const FILLED_SLOTS = 3;
const TOTAL_SLOTS = 4;

export function LivePreview() {
  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <SectionHeading
          eyebrow="پست‌های زنده"
          title="نمونه پارتی‌های در حال تشکیل"
          subtitle="همین حالا ببین کیا دنبال هم‌تیمی هستن"
        />
      </Reveal>

      <Reveal className="flex w-full flex-col items-center" y={32}>
        <Card
          highlighted
          className="w-full max-w-[600px] gap-6"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-text-dim" dir="auto">
                ۱۲ دقیقه پیش
              </p>
              <span className="size-2 rounded-full bg-success" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-start gap-1">
                <p className="text-base font-black text-text" dir="auto">
                  سینا (Arise)
                </p>
                <p className="text-xs font-bold text-accent" dir="auto">
                  رنک: Legend ۴
                </p>
              </div>
              <Image
                src="/images/landing/avatar-sina.png"
                alt=""
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            </div>
          </div>

          <p className="w-full text-right text-base leading-[1.6] text-text-dim" dir="auto">
            دنبال یک هاردساپورت باسابقه و تانکی آف‌لین برای لابی رنکد رول اروپا
            می‌گردیم. تیم وویس دیسکورده، لطفاً پلیرهای جدی درخواست بدن.
          </p>

          <div className="flex w-full flex-wrap items-start justify-end gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag.label}
                className={
                  tag.accent
                    ? "rounded-full border border-accent bg-primary/15 px-3 py-1.5 text-xs font-bold text-accent"
                    : "rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text"
                }
                dir="auto"
              >
                {tag.label}
              </span>
            ))}
          </div>

          <div className="flex w-full items-center justify-between border-t border-border pt-4">
            <Button size="sm">درخواست عضویت در پارتی</Button>
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold text-text" dir="auto">
                {FILLED_SLOTS} از {TOTAL_SLOTS} نفر پر شده
              </p>
              <div className="flex items-start gap-1">
                {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`size-2 rounded-[4px] ${
                      i < FILLED_SLOTS ? "bg-accent" : "bg-white/[0.08]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </Reveal>
    </section>
  );
}
