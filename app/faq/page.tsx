import type { Metadata } from "next";

import { SectionHeading } from "@/components/general/sectionHeading";
import { Reveal } from "@/components/general/reveal";
import { FaqAccordion } from "@/components/pages/faq/faqAccordion";

export const metadata: Metadata = {
  title: "سوالات متداول | دوتامیت",
  description: "پاسخ سوالات پرتکرار دربارهٔ دوتامیت، رنک تایید‌شده، چت صوتی و ساخت پارتی.",
};

export default function FaqPage() {
  return (
    <section className="flex w-full flex-col items-start gap-14 px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <SectionHeading
          eyebrow="راهنما"
          title="سوالات متداول"
          subtitle="هرچی دربارهٔ دوتامیت نیاز داری بدونی، اینجاست"
        />
      </Reveal>

      <Reveal className="w-full" y={16}>
        <div className="mx-auto w-full max-w-[760px]">
          <FaqAccordion />
        </div>
      </Reveal>
    </section>
  );
}
