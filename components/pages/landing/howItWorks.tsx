import { Card } from "@/components/general/card";
import Image from "next/image";
import { SectionHeading } from "@/components/general/sectionHeading";
import { RevealGroup } from "@/components/general/revealGroup";

const STEPS = [
  {
    number: "۳",
    title: "بازی و صعود",
    description: "وویس چت رو باز کن، دیسکورد وصل شو و با هماهنگی کامل بازی رو ببر.",
  },
  {
    number: "۲",
    title: "پست بذار یا ملحق شو",
    description:
      "مشخصات پارتیت رو بنویس یا تو لابی‌ها به پلیرهای دیگه درخواست بده.",
  },
  {
    number: "۱",
    title: "ثبت‌نام و اتصال استیم",
    description: "کمتر از ۱ دقیقه اکانتت رو بساز و پروفایل دوتا ۲ خودت رو متصل کن.",
  },
];

export function HowItWorks() {
  return (
    <section className="flex w-full flex-col items-start gap-16 bg-bg-alt px-6 py-20 md:px-[100px]">
      <SectionHeading
        eyebrow="راهنمای استفاده"
        title="چطوری هم‌تیمی پیدا کنم؟"
        subtitle="فقط در ۳ قدم ساده پارتی خودت رو بساز و وارد نبرد شو"
      />

      <RevealGroup className="grid w-full grid-cols-1 gap-8 md:grid-cols-3">
        {STEPS.map((step) => (
          <Card key={step.number} tone="surface-alt">
            <div className="flex w-full items-center justify-between">
              <p className="text-sm font-extrabold text-accent" dir="auto">
                مرحله جدید
              </p>
              <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                <p className="text-lg font-black text-white">{step.number}</p>
              </div>
            </div>
            <p className="w-full text-right text-xl font-black text-text" dir="auto">
              {step.title}
            </p>
            <p
              className="w-full text-right text-sm leading-[1.7] text-text-dim"
              dir="auto"
            >
              {step.description}
            </p>
          </Card>
        ))}
      </RevealGroup>

      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-surface-alt shadow-2xl">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-bg-alt via-bg-alt/20 to-transparent" />
        <Image
          src="/images/landing/dota-squad-varied.png"
          alt="یک تیم متنوع از هیروهای دوتا ۲ آمادهٔ هماهنگی برای مسابقه"
          width={1940}
          height={810}
          sizes="(max-width: 768px) 100vw, 85vw"
          className="h-52 w-full object-cover object-center md:h-72"
        />
        <div className="absolute inset-y-0 left-0 z-20 flex max-w-sm flex-col justify-center p-6 md:p-10">
          <p className="text-sm font-extrabold text-accent" dir="auto">پارتی خوب از هماهنگی شروع می‌شه</p>
          <p className="mt-2 text-xl font-black text-text md:text-2xl" dir="auto">هر نقش، کنار هم‌تیمی درستش</p>
        </div>
      </div>
    </section>
  );
}
