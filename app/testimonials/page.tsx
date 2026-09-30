import type { Metadata } from "next";

import { PageBanner } from "@/components/general/pageBanner";
import { TestimonialForm } from "@/components/pages/testimonials/testimonialForm";

export const metadata: Metadata = {
  title: "ثبت نظر شما | دوتامیت",
  description: "تجربه‌ات از دوتامیت رو با بقیه پلیرها به اشتراک بذار. نظرها بعد از تایید تیم ما توی صفحه اصلی نمایش داده میشن.",
};

export default function TestimonialsPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <PageBanner
        title="تجربه‌ات از دوتامیت چطور بود؟"
        subtitle="نظر صادقانه‌ات به بقیه پلیرها کمک می‌کنه. بعد از تایید تیم دوتامیت، نظرت توی صفحه اصلی نمایش داده میشه."
      />

      <div className="w-full max-w-[860px] px-6 py-14">
        <TestimonialForm />
      </div>
    </div>
  );
}
