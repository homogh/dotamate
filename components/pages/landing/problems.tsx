import Image from "next/image";

import { Card } from "@/components/general/card";
import { SectionHeading } from "@/components/general/sectionHeading";
import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";

const PROBLEMS = [
  {
    icon: "arrow-down",
    title: "باخت‌های پیاپی در رنکد",
    description:
      "نداشتن هماهنگی و پیک‌های اشتباه هم‌تیمی‌های رندوم، رنک شما رو نابود می‌کنه.",
  },
  {
    icon: "skull",
    title: "هم‌تیمی‌های سمی و ترول",
    description:
      "توی سولو کیو همیشه باید منتظر قطع اتصال، فحاشی و فید دادن عمدی باشید.",
  },
  {
    icon: "volume-off",
    title: "عدم استفاده از وویس چت",
    description:
      "در بازی‌های حساسی مثل دوتا ۲، ارتباط صوتی همه‌چیزه که معمولاً نادیده گرفته میشه.",
  },
];

export function Problems() {
  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <SectionHeading
          eyebrow="چالش‌های سولو کیو"
          title="چرا تنها بازی کردن سخت و خسته‌کننده‌ست؟"
          subtitle="بزرگ‌ترین مشکلات بازیکنان Dota 2 در صف‌های تک‌نفره"
        />
      </Reveal>

      <RevealGroup className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <Card key={problem.icon} className="shadow-[0px_12px_17px_rgba(0,0,0,0.7)]">
            <div className="flex size-12 items-center justify-center rounded-[8px] bg-danger-soft">
              <Image
                src={`/images/landing/${problem.icon}.svg`}
                alt=""
                width={24}
                height={24}
              />
            </div>
            <p className="w-full text-right text-xl font-black text-text" dir="auto">
              {problem.title}
            </p>
            <p
              className="w-full text-right text-sm leading-[1.7] text-text-dim"
              dir="auto"
            >
              {problem.description}
            </p>
          </Card>
        ))}
      </RevealGroup>
    </section>
  );
}
