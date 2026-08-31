import { Hero } from "@/components/pages/landing/hero";
import { Problems } from "@/components/pages/landing/problems";
import { HowItWorks } from "@/components/pages/landing/howItWorks";
import { LivePreview } from "@/components/pages/landing/livePreview";
import { Stats } from "@/components/pages/landing/stats";
import { Features } from "@/components/pages/landing/features";
import { Testimonials } from "@/components/pages/landing/testimonials";
import { FinalCta } from "@/components/pages/landing/finalCta";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-center">
      <Hero />
      <Problems />
      <HowItWorks />
      <LivePreview />
      <Stats />
      <Features />
      <Testimonials />
      <FinalCta />
    </div>
  );
}
