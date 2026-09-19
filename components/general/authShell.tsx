import type { ReactNode } from "react";
import Image from "next/image";

import { Reveal } from "@/components/general/reveal";
import { AuthTaglineCard } from "@/components/general/authTaglineCard";
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
    <div className="relative flex w-full flex-1 overflow-hidden">
      {/* One full-bleed background spanning the whole shell — not just a
          side panel — so the bespoke key art reads as the page's actual
          backdrop instead of being boxed into half the screen. */}
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes="100vw"
        quality={100}
        className="object-cover"
        style={{ objectPosition: imagePosition }}
        preload
      />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-bg via-bg/25 to-transparent lg:block" />
      <div className="absolute inset-0 bg-bg/50 lg:hidden" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/25 via-transparent to-bg/25" />

      <div className="relative z-10 grid w-full flex-1 lg:grid-cols-2">
        <div className="relative hidden items-center justify-center p-12 lg:flex">
          <AuthTaglineCard badge={badge} tagline={tagline} />
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-8 px-6 py-14 md:px-16">
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
    </div>
  );
}
