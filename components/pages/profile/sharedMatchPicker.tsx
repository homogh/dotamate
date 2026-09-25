"use client";

export interface SharedMatchOption {
  matchId: string;
  heroName: string;
  heroIcon: string;
  win: boolean;
  startAt: string;
  together: boolean;
  sameTeam: boolean;
}

// Lists the TARGET's recent matches (their hero, their result). Only the
// ones the viewer's own Steam account was also in are selectable — and for
// commends, only those where they were on the same team.
export function SharedMatchPicker({
  matches,
  notice,
  selected,
  onSelect,
  requireSameTeam = false,
  tone = "accent",
}: {
  matches: SharedMatchOption[] | null;
  notice: string | null;
  selected: string | null;
  onSelect: (matchId: string) => void;
  requireSameTeam?: boolean;
  tone?: "accent" | "success";
}) {
  if (matches === null) {
    return <p className="w-full py-2 text-center text-[12px] text-text-dim">در حال بررسی مچ‌های مشترک...</p>;
  }

  const selectedCls = tone === "success" ? "border-success bg-success/10" : "border-accent bg-accent/10";

  return (
    <div className="flex w-full flex-col gap-2">
      {notice && (
        <p className="w-full rounded-[8px] bg-[#ff9f0a]/[0.1] p-2.5 text-right text-[12px] leading-[1.6] text-[#ff9f0a]" dir="auto">
          {notice}
        </p>
      )}
      {matches.length > 0 && (
        <div className="flex max-h-56 w-full flex-col gap-1.5 overflow-y-auto">
          {matches.map((m) => {
            const eligible = m.together && (!requireSameTeam || m.sameTeam);
            return (
              <button
                key={m.matchId}
                type="button"
                disabled={!eligible}
                onClick={() => onSelect(m.matchId)}
                className={`flex w-full items-center justify-between gap-2 rounded-[8px] border p-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected === m.matchId ? selectedCls : "border-transparent bg-surface-alt enabled:hover:border-white/15"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {m.heroIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.heroIcon} alt="" className="size-7 shrink-0 rounded-[4px]" />
                  ) : (
                    <div className="size-7 shrink-0 rounded-[4px] bg-surface" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-bold text-text" dir="auto">
                      {m.heroName}
                    </span>
                    <span className="text-[10px] text-text-dim" dir="auto">
                      {new Date(m.startAt).toLocaleDateString("fa-IR")} · {m.win ? "برد" : "باخت"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MatchBadge together={m.together} sameTeam={m.sameTeam} />
                  <span className="text-[11px] text-text-dim" dir="ltr">
                    #{m.matchId}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchBadge({ together, sameTeam }: { together: boolean; sameTeam: boolean }) {
  if (!together) {
    return (
      <span className="rounded-[4px] bg-surface px-1.5 py-0.5 text-[10px] text-text-dim" dir="auto">
        تو نبودی
      </span>
    );
  }
  return sameTeam ? (
    <span className="rounded-[4px] bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success" dir="auto">
      هم‌تیمی
    </span>
  ) : (
    <span className="rounded-[4px] bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger" dir="auto">
      حریف
    </span>
  );
}
