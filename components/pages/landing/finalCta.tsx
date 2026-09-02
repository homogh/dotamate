import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/general/reveal";

export function FinalCta() {
  return (
    <section
      className="flex w-full flex-col items-center gap-10 px-6 py-20 md:px-[100px] md:py-[120px]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 720px 220px at 50% 50%, rgba(142,123,255,0.1) 0%, rgba(18,19,23,0) 70%), linear-gradient(90deg, #121317 0%, #121317 100%)",
      }}
    >
      <Reveal className="flex w-full flex-col items-center gap-10">
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
