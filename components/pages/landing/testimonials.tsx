import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { testimonialRankLabel } from "@/app/lib/testimonials";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/general/card";
import { SectionHeading } from "@/components/general/sectionHeading";
import { RevealGroup } from "@/components/general/revealGroup";
import { UserAvatar } from "@/components/general/userAvatar";

async function getApprovedTestimonials() {
  try {
    return await prisma.testimonial.findMany({
      where: { status: "APPROVED", user: { banned: false } },
      include: { user: { select: { displayName: true, avatarUrl: true, rank: true, rankTier: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 6,
    });
  } catch {
    return [];
  }
}

export async function Testimonials() {
  const testimonials = await getApprovedTestimonials();

  return (
    <section className="flex w-full flex-col items-start gap-14 bg-bg-alt px-6 py-20 md:px-[100px]">
      <SectionHeading
        eyebrow="نظرات بازیکنان"
        title="رضایت پلیرها از دوتامیت"
        subtitle="جامعه پلیرهای Dota 2 ایران درباره ما چه می‌گویند؟"
      />

      {testimonials.length === 0 ? (
        <Card tone="surface-alt" noHover className="w-full items-center gap-5 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-accent">
            <MessageSquareQuote size={26} />
          </div>
          <p className="text-lg font-black text-text" dir="auto">
            هنوز نظری ثبت نشده؛ اولین نفر باش!
          </p>
          <p className="max-w-[460px] text-sm leading-[1.8] text-text-dim" dir="auto">
            با دوتامیت پلی دادی؟ تجربه‌ات رو با بقیه پلیرها به اشتراک بذار. نظرت بعد از تایید تیم ما همین‌جا نمایش داده میشه.
          </p>
          <Button asChild>
            <Link href="/testimonials">ثبت نظر من</Link>
          </Button>
        </Card>
      ) : (
        <>
          <RevealGroup className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => {
              const rank = testimonialRankLabel(t.user.rank, t.user.rankTier);
              return (
                <Card key={t.id} tone="surface-alt">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col items-start gap-1">
                      <p className="text-base font-black text-text" dir="auto">
                        {t.user.displayName}
                      </p>
                      {rank && <p className="text-xs font-bold text-accent">{rank}</p>}
                    </div>
                    <UserAvatar name={t.user.displayName} avatarUrl={t.user.avatarUrl} size={40} />
                  </div>
                  <p className="w-full text-right text-sm leading-[1.8] text-text-dim" dir="auto">
                    {t.body}
                  </p>
                </Card>
              );
            })}
          </RevealGroup>

          <div className="flex w-full justify-center">
            <Button asChild variant="outline">
              <Link href="/testimonials">تجربه خودت رو با بقیه به اشتراک بذار</Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
