import { Card } from "@/components/general/card";
import { IconBadge } from "@/components/general/iconBadge";
import { SectionHeading } from "@/components/general/sectionHeading";
import { RevealGroup } from "@/components/general/revealGroup";

const FEATURES = [
  {
    icon: "steam-auth-placeholder",
    title: "احراز هویت خودکار رنک با استیم",
    description:
      "سیستم دوتامیت رنک دقیق شما رو مستقیم از اکانت استیم می‌خونه تا تقلب و ادعای دروغین پیش نیاد.",
  },
  {
    icon: "mic",
    title: "چت صوتی تیمی و هماهنگ",
    description:
      "امکان ست کردن آیدی تیم‌اسپیک یا لینک دیسکورد اختصاصی لابی برای هماهنگی صوتی بی‌نقص.",
  },
  {
    icon: "calendar",
    title: "برنامه‌ریزی بازی‌ها",
    description:
      "می‌تونی برای روزهای آینده و ساعت‌های مشخصی لابی بسازی و اعضا رو از قبل فیکس کنی.",
  },
  {
    icon: "globe",
    title: "محیط کاملاً فارسی و بومی",
    description:
      "بدون نیاز به پینگ بالا یا زبان انگلیسی، با هم‌زبون‌های خودت پارتی شو و بازی کن.",
  },
];

export function Features() {
  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg px-6 py-20 md:px-[100px]">
      <SectionHeading
        eyebrow="امکانات پلتفرم"
        title="چرا باید از دوتامیت استفاده کنید؟"
        subtitle="قابلیت‌های بی‌نظیر برای مدیریت و هماهنگی راحت‌تر تیم"
      />

      <RevealGroup className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.icon} className="gap-4">
            <IconBadge src={`/images/landing/${feature.icon}.svg`} size={22} />
            <p className="w-full text-right text-xl font-black text-text" dir="auto">
              {feature.title}
            </p>
            <p
              className="w-full text-right text-sm leading-[1.7] text-text-dim"
              dir="auto"
            >
              {feature.description}
            </p>
          </Card>
        ))}
      </RevealGroup>
    </section>
  );
}
