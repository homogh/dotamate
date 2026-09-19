"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { BadgePulse } from "@/components/general/badgePulse";

gsap.registerPlugin(useGSAP);

interface AuthTaglineCardProps {
  badge: string;
  tagline: string;
}

/**
 * Glass card centered over the auth key art — same recipe as the Hero
 * section's content card (border + bg-bg/45 + backdrop-blur-xl) so the auth
 * flow reads as the same product. The drop shadow breathes gently instead
 * of sitting static, echoing BadgePulse's motion language elsewhere on the
 * shell.
 */
export function AuthTaglineCard({ badge, tagline }: AuthTaglineCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(cardRef.current, {
          boxShadow: "0 18px 70px rgba(0,0,0,0.4), 0 0 46px rgba(142,123,255,0.4)",
          duration: 2.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      return () => mm.revert();
    },
    { scope: cardRef }
  );

  return (
    <div
      ref={cardRef}
      className="relative flex w-full max-w-[380px] flex-col items-center gap-3 rounded-3xl border border-white/[0.12] bg-bg/45 px-7 py-8 text-center shadow-[0_18px_70px_rgba(0,0,0,0.4),0_0_0px_rgba(142,123,255,0)] backdrop-blur-xl"
    >
      <BadgePulse tone="accent">{badge}</BadgePulse>
      <p className="text-balance text-[22px] font-black leading-[1.5] text-text" dir="auto">
        {tagline}
      </p>
    </div>
  );
}
