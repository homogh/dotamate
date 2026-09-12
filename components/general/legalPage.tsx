import { PageBanner } from "@/components/general/pageBanner";
import { RevealGroup } from "@/components/general/revealGroup";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ eyebrow, title, updatedAt, intro, sections }: LegalPageProps) {
  return (
    <div className="content-page flex w-full flex-col items-center">
      <PageBanner
        eyebrow={eyebrow}
        title={title}
        subtitle={`آخرین به‌روزرسانی: ${updatedAt} — ${intro}`}
        imageSrc="/images/support-banner.png"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="mx-auto w-full max-w-[960px] rounded-2xl border border-border bg-surface p-6 shadow-[0_18px_55px_rgba(0,0,0,0.2)] md:p-10">
          <RevealGroup className="flex w-full flex-col gap-7">
            {sections.map((section) => (
              <div key={section.title} className="flex w-full flex-col items-start gap-3 border-b border-border/70 pb-7 last:border-0 last:pb-0">
                <h2 className="w-full text-right text-lg font-black text-accent md:text-xl" dir="auto">
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
            ))}
          </RevealGroup>
        </div>
      </div>
    </div>
  );
}
