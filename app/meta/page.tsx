import type { Metadata } from "next";

import { SectionHeading } from "@/components/general/sectionHeading";
import { Card } from "@/components/general/card";
import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";
import { CURRENT_PATCH, META_ROLES } from "@/app/lib/metaHeroes";

export const metadata: Metadata = {
  title: "متا | دوتامیت",
  description: "قوی‌ترین هیروهای هر پوزیشن در پچ فعلی Dota 2، بر اساس وین‌ریت و پیک‌ریت.",
};

export default function MetaPage() {
  return (
    <section className="flex w-full flex-col items-start gap-14 px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <div className="flex w-full flex-col items-center gap-4">
          <SectionHeading
            eyebrow="متای فعلی"
            title="کدوم هیروها الان قوی‌ترن؟"
            subtitle="بر اساس وین‌ریت واقعی بازیکنان دوتامیت در پچ فعلی"
          />
          <span
            className="rounded-full border border-border bg-white/[0.06] px-4 py-1.5 text-xs font-bold text-accent"
            dir="ltr"
          >
            Patch {CURRENT_PATCH}
          </span>
        </div>
      </Reveal>

      <RevealGroup className="grid w-full grid-cols-1 gap-6 lg:grid-cols-5 md:grid-cols-2">
        {META_ROLES.map((role) => (
          <Card key={role.position} tone="surface-alt" className="gap-5">
            <div className="flex w-full flex-col items-start gap-0.5">
              <p className="text-sm font-extrabold text-accent" dir="ltr">
                {role.position}
              </p>
              <p className="text-lg font-black text-text" dir="auto">
                {role.role}
              </p>
            </div>

            <div className="flex w-full flex-col gap-4">
              {role.heroes.map((hero, index) => (
                <div key={hero.name} className="flex w-full flex-col gap-1.5">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-sm font-bold text-text" dir="ltr">
                      {index + 1}. {hero.name}
                    </p>
                    <p className="text-xs font-bold text-success" dir="ltr">
                      {hero.winRate}%
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${hero.winRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-dim" dir="ltr">
                    Pick rate: {hero.pickRate}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </RevealGroup>
    </section>
  );
}
