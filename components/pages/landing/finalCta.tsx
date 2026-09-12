import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/general/reveal";

export function FinalCta() {
  return (
    <section
      className="relative flex w-full flex-col items-center gap-10 overflow-hidden px-6 py-24 md:px-[100px] md:py-[140px]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 720px 220px at 50% 50%, rgba(142,123,255,0.1) 0%, rgba(18,19,23,0) 70%), linear-gradient(90deg, #121317 0%, #121317 100%)",
      }}
    >
      <Image
        src="/images/landing/dota-rank-varied.png"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none object-cover opacity-35"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-bg/75 to-bg" />
      <Reveal className="relative flex w-full flex-col items-center gap-10">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-5 text-center">
          <h2 className="w-full text-balance text-[28px] font-black text-text md:text-[36px]" dir="auto">
            آماده‌ای رنکت رو بالا ببری؟
          </h2>
          <p className="w-full text-base leading-[1.7] text-text-dim" dir="auto">
            همین الان ثبت‌نام کن، به لابی‌های فعال ملحق شو و لذت واقعی کار تیمی
            در دوتا ۲ رو تجربه کن.
          </p>
        </div>
        <Button asChild size="default">
          <Link href="/signup">همین الان رایگان شروع کن</Link>
        </Button>
      </Reveal>
    </section>
  );
}
