import { Reveal } from "@/components/general/reveal";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ title, updatedAt, intro, sections }: LegalPageProps) {
  return (
    <section className="flex w-full flex-col items-center px-6 py-20 md:px-[100px]">
      <Reveal className="flex w-full max-w-[760px] flex-col gap-4 text-center">
        <h1 className="w-full text-[32px] font-black text-text" dir="auto">
          {title}
        </h1>
        <p className="w-full text-sm text-text-dim" dir="auto">
          آخرین به‌روزرسانی: {updatedAt}
        </p>
        <p className="w-full text-base leading-[1.8] text-text-dim" dir="auto">
          {intro}
        </p>
      </Reveal>

      <div className="mt-14 flex w-full max-w-[760px] flex-col gap-10">
        {sections.map((section, index) => (
          <Reveal key={section.title} y={16} delay={Math.min(index * 0.03, 0.15)}>
            <div className="flex flex-col items-start gap-3">
              <h2 className="w-full text-right text-xl font-black text-text" dir="auto">
                {section.title}
              </h2>
              {section.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="w-full text-right text-sm leading-[1.9] text-text-dim"
                  dir="auto"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
