import { MessageCircle, Swords, ThumbsUp } from "lucide-react";

import { Card } from "@/components/general/card";
import {
  COMMEND_BONUS,
  COMMEND_TYPES,
  COMMENDS_PER_BONUS,
  SCORE_MAX,
  scoreTier,
  type CommendTypeValue,
  type ScoreTier,
} from "@/app/lib/behavior";

const TONE_TEXT: Record<ScoreTier["tone"], string> = {
  success: "text-success",
  accent: "text-accent",
  warning: "text-[#ff9f0a]",
  danger: "text-danger",
};

const TONE_BAR: Record<ScoreTier["tone"], string> = {
  success: "bg-success",
  accent: "bg-accent",
  warning: "bg-[#ff9f0a]",
  danger: "bg-danger",
};

export interface CommendSummary {
  total: number;
  byType: Partial<Record<CommendTypeValue, number>>;
  progress: number;
}

export function BehaviorScoreCard({
  behaviorScore,
  communicationScore,
  commends,
}: {
  behaviorScore: number;
  communicationScore: number;
  commends: CommendSummary;
}) {
  return (
    <Card tone="surface" noHover className="w-full gap-4 p-6">
      <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
        امتیاز رفتار
      </p>
      <ScoreRow icon={Swords} label="رفتار در بازی" score={behaviorScore} />
      <ScoreRow icon={MessageCircle} label="ارتباطات (چت و ویس)" score={communicationScore} />

      <div className="flex w-full flex-col gap-2.5 border-t border-border pt-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-[18px] font-black text-success">{commends.total.toLocaleString("fa-IR")}</span>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-text-dim" dir="auto">
              کامند از هم‌تیمی‌ها
            </span>
            <ThumbsUp size={14} className="text-text-dim" />
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-1.5">
          {COMMEND_TYPES.map((t) => (
            <div key={t.value} className="flex items-center justify-between rounded-[6px] bg-surface-alt px-2.5 py-1.5">
              <span className="text-[12px] font-bold text-text">{(commends.byType[t.value] ?? 0).toLocaleString("fa-IR")}</span>
              <span className="text-[11px] text-text-dim" dir="auto">
                {t.label}
              </span>
            </div>
          ))}
        </div>
        <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
          {commends.progress.toLocaleString("fa-IR")} از {COMMENDS_PER_BONUS.toLocaleString("fa-IR")} کامند تا{" "}
          {COMMEND_BONUS.toLocaleString("fa-IR")}+ امتیاز رفتار
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-success" style={{ width: `${(commends.progress / COMMENDS_PER_BONUS) * 100}%` }} />
        </div>
      </div>

      <p className="w-full text-right text-[11px] leading-[1.6] text-text-dim" dir="auto">
        مثل خود دوتا، فقط گزارش‌هایی که پشتیبانی تایید کنه امتیاز رو کم می‌کنن و کامند هم‌تیمی‌ها امتیاز رو برمی‌گردونه.
      </p>
    </Card>
  );
}

function ScoreRow({ icon: Icon, label, score }: { icon: typeof Swords; label: string; score: number }) {
  const tier = scoreTier(score);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-baseline gap-1.5" dir="ltr">
          <span className={`text-[18px] font-black ${TONE_TEXT[tier.tone]}`}>{score.toLocaleString("fa-IR")}</span>
          <span className="text-[11px] text-text-dim">/ {SCORE_MAX.toLocaleString("fa-IR")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-[4px] bg-surface-alt px-2 py-0.5 text-[11px] font-bold ${TONE_TEXT[tier.tone]}`} dir="auto">
            {tier.label}
          </span>
          <span className="text-[13px] text-text-dim" dir="auto">
            {label}
          </span>
          <Icon size={14} className="text-text-dim" />
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
        <div className={`h-full rounded-full ${TONE_BAR[tier.tone]}`} style={{ width: `${(score / SCORE_MAX) * 100}%` }} />
      </div>
    </div>
  );
}
