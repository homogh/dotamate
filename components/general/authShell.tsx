import type { ReactNode } from "react";
import Image from "next/image";

import { Reveal } from "@/components/general/reveal";
import { BadgePulse } from "@/components/general/badgePulse";
import { Card } from "@/components/ui/card";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Key art for the desktop side panel / mobile top strip. */
  imageSrc?: string;
  imagePosition?: string;
  /** Short line shown over the key art, under the badge. */
  tagline?: string;
  badge?: string;
}

/**
 * Shared shell for every auth-flow screen (login, signup, reset password,
 * Steam connect, profile setup). Desktop splits into the same illustrated
 * key-art + gradient-glow language as the landing Hero and PageBanner, so
 * the auth flow reads as the same product instead of a bare settings form;
 * mobile collapses the art into a short strip above the form card.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  imageSrc = "/images/landing/dota-party-hero-v2.png",
  imagePosition = "68% center",
  tagline = "بدون هم‌تیمی سمی، فقط بازی خوب",
  badge = "پلتفرم تخصصی هماهنگی پارتی Dota 2",
}: AuthShellProps) {
  return (
    <div className="grid w-full flex-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          style={{ objectPosition: imagePosition }}
          preload
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-bg/5" />
        <div className="absolute inset-0 bg-gradient-to-l from-bg/15 via-transparent to-bg/80" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-12">
          <BadgePulse tone="accent">{badge}</BadgePulse>
          <p className="max-w-[360px] text-balance text-[26px] font-black leading-[1.4] text-text" dir="auto">
            {tagline}
          </p>
        </div>
      </div>

      <div
        className="relative flex w-full flex-col items-center justify-center gap-8 overflow-hidden px-6 py-14 md:px-16"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 640px 260px at 50% 0%, rgba(61,60,206,0.16) 0%, rgba(18,19,23,0) 78%)",
        }}
      >
        <div className="relative -mx-6 -mt-14 mb-2 h-[150px] w-[calc(100%+3rem)] overflow-hidden lg:hidden">
          <Image src={imageSrc} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: imagePosition }} />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/10 via-bg/70 to-bg" />
        </div>

        <Reveal className="flex w-full max-w-[420px] flex-col gap-6">
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <div className="flex size-11 items-center justify-center rounded-[10px] bg-primary shadow-[0_0_20px_rgba(75,80,230,0.35)]">
              <Image src="/images/landing/shield-check.svg" alt="" width={22} height={22} />
            </div>
            <h1 className="mt-2 w-full text-balance text-[26px] font-black text-text md:text-[28px]" dir="auto">
              {title}
            </h1>
            <p className="w-full text-sm leading-[1.7] text-text-dim" dir="auto">
              {subtitle}
            </p>
          </div>

          <Card className="w-full gap-0 rounded-[16px] border-white/[0.08] bg-surface/90 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            {children}
          </Card>

          {footer && (
            <p className="w-full text-center text-sm text-text-dim" dir="auto">
              {footer}
            </p>
          )}
        </Reveal>
      </div>
    </div>
  );
}
