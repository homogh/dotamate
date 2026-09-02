import { Card } from "@/components/general/card";
import { IconBadge } from "@/components/general/iconBadge";
import { SectionHeading } from "@/components/general/sectionHeading";
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
      <SectionHeading
        eyebrow="چالش‌های سولو کیو"
        title="چرا تنها بازی کردن سخت و خسته‌کننده‌ست؟"
        subtitle="بزرگ‌ترین مشکلات بازیکنان Dota 2 در صف‌های تک‌نفره"
      />

      <RevealGroup className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <Card key={problem.icon}>
            <IconBadge src={`/images/landing/${problem.icon}.svg`} tone="danger" />
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
