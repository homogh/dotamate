"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RevealGroup } from "@/components/general/revealGroup";
import { CountUpStat } from "@/components/general/countUpStat";

interface LandingStats {
  activePlayers: number;
  completedSessions: number;
  acceptedJoins: number;
}

const EMPTY_STATS: LandingStats = { activePlayers: 0, completedSessions: 0, acceptedJoins: 0 };

export function Stats() {
  const [stats, setStats] = useState<LandingStats>(EMPTY_STATS);

  useEffect(() => {
    fetch("/api/landing", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setStats(json.data.stats);
      })
      .catch(() => {});
  }, []);

  const displayStats = [
    { target: stats.activePlayers, suffix: "", label: "بازیکن فعال در ۳۰ روز اخیر" },
    { target: stats.completedSessions, suffix: "", label: "لابی تکمیل‌شده" },
    { target: stats.acceptedJoins, suffix: "", label: "عضویت تأییدشده در پارتی‌ها" },
  ];

  return (
    <section className="flex w-full overflow-hidden border-y border-border bg-surface-alt py-16 md:py-20">
      <RevealGroup className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-8 py-8 md:flex-row md:px-40">
        <Image
          src="/images/landing/axe-berserkers-call-cutout.png"
          alt=""
          width={700}
          height={700}
          className="pointer-events-none absolute -bottom-20 -left-10 hidden h-[290px] w-auto object-contain md:block"
        />
        <Image
          src="/images/landing/queenofpain-sonic-wave.png"
          alt=""
          width={700}
          height={700}
          className="pointer-events-none absolute -bottom-20 -right-12 hidden h-[275px] w-auto object-contain mix-blend-screen md:block"
        />
        {displayStats.map((stat) => (
          <div key={stat.label} className="relative z-10 flex flex-1 flex-col items-center gap-3">
            <CountUpStat
              target={stat.target}
              suffix={stat.suffix}
              className="text-[40px] font-black tabular-nums text-accent"
            />
            <p className="text-base font-bold text-text-dim" dir="auto">
              {stat.label}
            </p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
