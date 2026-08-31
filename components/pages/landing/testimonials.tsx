import Image from "next/image";

import { Card } from "@/components/general/card";
import { SectionHeading } from "@/components/general/sectionHeading";
import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";

const TESTIMONIALS = [
  {
    name: "حمیدرضا",
    rank: "Ancient ۲",
    avatar: "avatar-hamidreza",
    quote:
      "از وقتی با دوتامیت پلی میدم، تونستم بالاخره از مدال لجند خارج بشم. پیدا کردن یه‌سری آدم با وویس و هماهنگ همه‌چیز رو تغییر داد.",
  },
  {
    name: "امیرمهدی",
    rank: "Divine ۱",
    avatar: "avatar-amirmahdi",
    quote:
      "سیستم تایید رنک استیم عالیه. دیگه کسی نمی‌تونه فیک باشه و الکی بگه من مدالم اینه. لابی‌های تمیزی اینجا تشکیل میشه.",
  },
];

export function Testimonials() {
  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg-alt px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <SectionHeading
          eyebrow="نظرات بازیکنان"
          title="رضایت پلیرها از دوتامیت"
          subtitle="جامعه پلیرهای Dota 2 ایران درباره ما چه می‌گویند؟"
        />
      </Reveal>

      <RevealGroup className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} tone="surface-alt">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col items-start gap-1">
                <p className="text-base font-black text-text" dir="auto">
                  {t.name}
                </p>
                <p className="text-xs font-bold text-accent">{t.rank}</p>
              </div>
              <Image
                src={`/images/landing/${t.avatar}.png`}
                alt=""
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            </div>
            <p className="w-full text-right text-sm leading-[1.8] text-text-dim" dir="auto">
              {t.quote}
            </p>
          </Card>
        ))}
      </RevealGroup>
    </section>
  );
}
