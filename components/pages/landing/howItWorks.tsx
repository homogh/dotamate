import { Card } from "@/components/general/card";
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
    </section>
  );
}
