"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { UserAvatar } from "@/components/general/userAvatar";
import { Switch } from "@/components/ui/switch";
import { POSITIONS, POSITION_ICON, POSITION_LABEL, POSITION_LABEL_FA, type PositionValue } from "@/components/dashboard/positionMeta";
import { RANK_OPTIONS, REGION_OPTIONS, GAME_MODE_OPTIONS, RANK_LABEL, REGION_LABEL } from "@/components/dashboard/postLabels";

const STEPS = ["نقش", "پوزیشن‌های لازم", "رنک", "حالت بازی", "سرورها", "نوع جلسه", "جزئیات"];
const LAST_STEP = STEPS.length;

export interface PostFormValues {
  position: PositionValue | null;
  neededPositions: PositionValue[];
  rank: string | null;
  rankTier: number | null;
  gameMode: string | null;
  regions: string[];
  sessionType: "NOW" | "SCHEDULED";
  startAt: string;
  partySize: number;
  hasVoice: boolean;
  voiceLink: string;
  description: string;
}

export const EMPTY_POST_FORM: PostFormValues = {
  position: null,
  neededPositions: [],
  rank: null,
  rankTier: null,
  gameMode: null,
  regions: [],
  sessionType: "NOW",
  startAt: "",
  partySize: 5,
  hasVoice: true,
  voiceLink: "",
  description: "",
};

// ISO → the "YYYY-MM-DDTHH:mm" local value a datetime-local input expects.
export function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  mode: "create" | "edit";
  postId?: number;
  initial?: PostFormValues;
  // Edit only: needed positions an accepted member already fills — can't be removed.
  lockedPositions?: string[];
  // Edit only: host + accepted members; party size can't drop below it.
  memberCount?: number;
  displayName: string;
  avatarUrl: string | null;
}

export function PostForm({ mode, postId, initial, lockedPositions = [], memberCount = 1, displayName, avatarUrl }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = mode === "edit";

  const [step, setStep] = useState(1);
  const [values, setValues] = useState<PostFormValues>(initial ?? EMPTY_POST_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { position, neededPositions, rank, rankTier, gameMode, regions, sessionType, startAt, hasVoice, voiceLink, description } = values;
  // Picking needed positions fixes the party size: host + one per slot.
  const partySize = neededPositions.length ? neededPositions.length + 1 : values.partySize;

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function choosePosition(p: PositionValue) {
    setValues((v) => ({ ...v, position: p, neededPositions: v.neededPositions.filter((n) => n !== p) }));
  }

  function toggleNeeded(p: PositionValue) {
    if (lockedPositions.includes(p)) return;
    setValues((v) => ({
      ...v,
      neededPositions: v.neededPositions.includes(p)
        ? v.neededPositions.filter((n) => n !== p)
        : POSITIONS.filter((x) => x === p || v.neededPositions.includes(x)),
    }));
  }

  function toggleRegion(r: string) {
    setValues((v) => ({
      ...v,
      regions: v.regions.includes(r)
        ? v.regions.filter((x) => x !== r)
        : REGION_OPTIONS.map((o) => o.value as string).filter((x) => x === r || v.regions.includes(x)),
    }));
  }

  const stepValid = (n: number) =>
    (n === 1 && Boolean(position)) ||
    n === 2 ||
    (n === 3 && Boolean(rank)) ||
    (n === 4 && Boolean(gameMode)) ||
    (n === 5 && regions.length > 0) ||
    (n === 6 && (sessionType === "NOW" || Boolean(startAt))) ||
    n === 7;

  async function handleSubmit() {
    setError(null);
    const invalidStep = STEPS.findIndex((_, i) => !stepValid(i + 1));
    if (invalidStep !== -1) {
      setStep(invalidStep + 1);
      setError(`مرحله «${STEPS[invalidStep]}» کامل نشده.`);
      return;
    }
    if (description.trim().length < 10) {
      setStep(LAST_STEP);
      setError("توضیحات پست باید حداقل ۱۰ کاراکتر باشه.");
      return;
    }
    if (partySize < memberCount) {
      setError(`الان ${memberCount} نفر توی پارتی هستن؛ ظرفیت نمی‌تونه کمتر از این باشه.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/posts/${postId}` : "/api/posts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          neededPositions,
          rank,
          rankTier: rank === "IMMORTAL" ? null : rankTier,
          gameMode,
          regions,
          sessionType,
          startAt: sessionType === "SCHEDULED" && startAt ? new Date(startAt).toISOString() : null,
          partySize,
          hasVoice,
          voiceLink: hasVoice ? voiceLink.trim() : "",
          description: description.trim(),
        }),
      });
      const json = await res.json();
      if (json.status !== "success") {
        setError(json.message ?? "خطایی پیش اومد.");
        setSubmitting(false);
        return;
      }
      if (isEdit) toast.success(json.message ?? "پست به‌روزرسانی شد.");
      router.push("/dashboard/my-posts");
      router.refresh();
    } catch {
      setError("مشکلی در ارتباط با سرور پیش اومد.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="-mx-6 flex w-[calc(100%+48px)] items-center justify-start gap-4 overflow-x-auto px-6 py-2 md:-mx-10 md:w-[calc(100%+80px)] md:px-10 lg:mx-0 lg:w-full lg:justify-center lg:gap-5 lg:overflow-visible lg:px-0">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = isEdit ? stepValid(n) && !active : n < step;
          return (
            <button
              key={label}
              type="button"
              disabled={!isEdit}
              onClick={() => setStep(n)}
              className="flex shrink-0 items-center gap-2 disabled:cursor-default"
            >
              {i > 0 && <div className="h-px w-6 shrink-0 bg-border" />}
              <span className={`shrink-0 whitespace-nowrap text-[14px] ${active ? "text-text" : "text-text-dim"}`} dir="auto">
                {label}
              </span>
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active || done ? "bg-primary text-white" : "border border-border bg-surface text-white"
                }`}
              >
                {done ? <Check size={12} /> : n}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col-reverse items-start gap-6 lg:flex-row">
        <div className="w-full lg:w-[420px] lg:shrink-0">
          <Card tone="surface" noHover className="w-full gap-6 p-7">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              پیش‌نمایش زنده پست شما
            </p>

            <div className="flex w-full flex-col gap-4 rounded-[12px] border border-primary bg-surface-alt p-5">
              <div className="flex w-full items-center justify-between">
                <p className="text-[12px] text-text-dim" dir="auto">
                  {sessionType === "NOW" ? "الان" : startAt ? new Date(startAt).toLocaleString("fa-IR") : "زمان‌بندی شده"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {displayName || "شما"}
                    </p>
                    <p className="text-[11px] text-accent" dir="auto">
                      {rank ? RANK_LABEL[rank] : "—"} {rank !== "IMMORTAL" ? (rankTier ?? "") : ""}
                    </p>
                  </div>
                  <div className="rounded-full border-[1.5px] border-success">
                    <UserAvatar name={displayName || "شما"} avatarUrl={avatarUrl} size={36} round />
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col items-end gap-1.5">
                <p className="text-[13px] font-bold text-text-dim" dir="auto">
                  {position ? POSITION_LABEL[position] : "پوزیشن انتخاب نشده"}
                </p>
                <p className="w-full break-words text-right text-[12px] text-text-dim" dir="auto">
                  {description || "توضیحات تکمیلی پست در این قسمت نمایش داده خواهد شد..."}
                </p>
              </div>

              {neededPositions.length > 0 && (
                <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                  <span className="text-[11px] text-text-dim" dir="auto">
                    دنبال:
                  </span>
                  {neededPositions.map((p) => (
                    <span key={p} className="rounded-[4px] border border-accent/40 px-2 py-0.5 text-[11px] font-bold text-accent">
                      {POSITION_LABEL[p].split(" - ")[0]}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                {(regions.length ? regions : [null]).map((r) => (
                  <span key={r ?? "none"} className="rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                    {r ? REGION_LABEL[r] : "سرور"}
                  </span>
                ))}
                <span className="rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-accent" dir="auto">
                  پارتی: {memberCount}/{partySize}
                </span>
              </div>
            </div>

            <div className="w-full rounded-[8px] bg-primary/[0.08] p-3">
              <p className="text-right text-[12px] leading-[1.6] text-accent" dir="auto">
                این پیش‌نمایش دقیقاً همینه که بقیه بازیکن‌ها توی مرور پست‌ها می‌بینن.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex w-full flex-1 flex-col gap-6">
          {step === 1 && (
            <StepShell title="نقشت رو انتخاب کن" subtitle="پوزیشنی که در این لابی می‌خواهی بازی کنی را فیکس کن">
              <div className="flex flex-wrap gap-4">
                {POSITIONS.map((p) => (
                  <PositionTile key={p} position={p} active={position === p} onClick={() => choosePosition(p)} />
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="دنبال چه پوزیشن‌هایی هستی؟"
              subtitle="هر کسی جوین بشه، پوزیشن اصلی پروفایلش از این لیست پر می‌شه. اگه هیچ‌کدوم رو انتخاب نکنی، همه پوزیشن‌ها آزادن."
            >
              <div className="flex flex-wrap gap-4">
                {POSITIONS.filter((p) => p !== position).map((p) => {
                  const locked = lockedPositions.includes(p);
                  return (
                    <PositionTile
                      key={p}
                      position={p}
                      active={neededPositions.includes(p)}
                      locked={locked}
                      onClick={() => toggleNeeded(p)}
                    />
                  );
                })}
              </div>
              <p className="text-right text-[13px] text-text-dim" dir="auto">
                {neededPositions.length
                  ? `${neededPositions.length} پوزیشن انتخاب شد — اندازه پارتی: ${partySize} نفر`
                  : "بدون محدودیت پوزیشن — اندازه پارتی رو توی مرحله «نوع جلسه» انتخاب کن."}
              </p>
              {lockedPositions.length > 0 && (
                <p className="text-right text-[12px] text-text-dim" dir="auto">
                  پوزیشن‌های قفل‌شده الان توسط یکی از اعضای پارتی پر شدن و قابل حذف نیستن.
                </p>
              )}
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="رنکت رو مشخص کن" subtitle="رنک فعلی که تو این پست نمایش داده می‌شه">
              <div className="flex flex-wrap gap-4">
                {RANK_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => set("rank", r.value)}
                    className={`flex w-[130px] flex-col items-center gap-2 rounded-[12px] border p-4 transition-colors ${
                      rank === r.value ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                    }`}
                  >
                    <p className="text-[14px] font-black text-text">{r.label}</p>
                  </button>
                ))}
              </div>
              {rank && rank !== "IMMORTAL" && (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    ستاره:
                  </span>
                  {[1, 2, 3, 4, 5].map((t) => (
                    <button
                      key={t}
                      onClick={() => set("rankTier", t)}
                      className={`flex size-8 items-center justify-center rounded-[6px] text-[12px] font-bold ${
                        rankTier === t ? "bg-primary text-white" : "border border-border bg-surface text-text-dim"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="حالت بازی رو انتخاب کن" subtitle="این لابی برای کدوم گیم‌مود تشکیل می‌شه">
              <div className="flex flex-wrap gap-4">
                {GAME_MODE_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => set("gameMode", m.value)}
                    className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                      gameMode === m.value ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                    }`}
                  >
                    <p className="text-[14px] font-black text-text">{m.label}</p>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="سرورها رو انتخاب کن" subtitle="می‌تونی چند سرور رو با هم انتخاب کنی — هر کدوم که برای همه بهتر بود">
              <div className="flex flex-wrap gap-4">
                {REGION_OPTIONS.map((rg) => {
                  const active = regions.includes(rg.value);
                  return (
                    <button
                      key={rg.value}
                      onClick={() => toggleRegion(rg.value)}
                      className={`relative flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check size={12} />
                        </span>
                      )}
                      <p className="text-[14px] font-black text-text" dir="auto">
                        {rg.label}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-right text-[13px] text-text-dim" dir="auto">
                {regions.length ? `${regions.length} سرور انتخاب شد` : "حداقل یک سرور انتخاب کن"}
              </p>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="نوع جلسه رو مشخص کن" subtitle="همین الان دنبال هم‌تیمی هستی یا برای بعداً برنامه می‌چینی؟">
              <div className="flex flex-wrap gap-4">
                {(["NOW", "SCHEDULED"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set("sessionType", t)}
                    className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                      sessionType === t ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                    }`}
                  >
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {t === "NOW" ? "همین الان" : "زمان‌بندی‌شده"}
                    </p>
                  </button>
                ))}
              </div>

              {sessionType === "SCHEDULED" && (
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => set("startAt", e.target.value)}
                  className="rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text focus:outline-none"
                  dir="ltr"
                />
              )}

              <div className="flex w-full flex-wrap items-center justify-end gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    وویس دارم
                  </span>
                  <Switch checked={hasVoice} onChange={(v) => set("hasVoice", v)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    اندازه پارتی:
                  </span>
                  {neededPositions.length ? (
                    <span className="text-[13px] font-bold text-accent" dir="auto">
                      {partySize} نفر (بر اساس پوزیشن‌های لازم)
                    </span>
                  ) : (
                    [2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        disabled={n < memberCount}
                        onClick={() => set("partySize", n)}
                        className={`flex size-8 items-center justify-center rounded-[6px] text-[12px] font-bold disabled:opacity-30 ${
                          partySize === n ? "bg-primary text-white" : "border border-border bg-surface text-text-dim"
                        }`}
                      >
                        {n}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </StepShell>
          )}

          {step === 7 && (
            <StepShell title="جزئیات پست" subtitle="یه توضیح کوتاه بنویس تا بقیه بدونن دنبال چی هستی">
              <textarea
                value={description}
                onChange={(e) => set("description", e.target.value)}
                rows={5}
                placeholder="مثلاً: دنبال هارد ساپورت رنک بالا و با وویس دیسکورد..."
                dir="auto"
                className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-4 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
              />
              {hasVoice && (
                <div className="flex w-full flex-col items-end gap-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    لینک وویس (دیسکورد و...) — اختیاری
                  </span>
                  <input
                    value={voiceLink}
                    onChange={(e) => set("voiceLink", e.target.value)}
                    placeholder="https://discord.gg/..."
                    dir="ltr"
                    className="w-full rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
                  />
                </div>
              )}
            </StepShell>
          )}

          {error && (
            <p className="text-right text-sm text-red-400" dir="auto">
              {error}
            </p>
          )}

          <div className="flex w-full flex-wrap gap-3 pt-2">
            {(isEdit || step === LAST_STEP) && (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="flex flex-1 items-center justify-center rounded-[8px] bg-primary px-8 py-3.5 text-[14px] font-bold text-white transition-opacity hover:bg-primary-hover disabled:opacity-60"
                dir="auto"
              >
                {isEdit ? (submitting ? "در حال ذخیره..." : "ذخیره تغییرات") : submitting ? "در حال ساخت..." : "ایجاد پست"}
              </button>
            )}
            {step < LAST_STEP && (
              <button
                disabled={!stepValid(step)}
                onClick={() => setStep((s) => Math.min(LAST_STEP, s + 1))}
                className={`flex flex-1 items-center justify-center rounded-[8px] px-8 py-3.5 text-[14px] font-bold transition-opacity disabled:opacity-40 ${
                  isEdit ? "border border-border bg-surface-alt text-text hover:enabled:bg-white/5" : "bg-primary text-white hover:bg-primary-hover"
                }`}
                dir="auto"
              >
                {isEdit ? "مرحله بعد" : "ادامه و مرحله بعد"}
              </button>
            )}
            <button
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="flex flex-1 items-center justify-center rounded-[8px] border border-border bg-surface-alt px-8 py-3.5 text-[14px] font-bold text-text-dim transition-opacity hover:enabled:bg-white/5 disabled:opacity-40"
              dir="auto"
            >
              قبلی
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PositionTile({
  position,
  active,
  locked,
  onClick,
}: {
  position: PositionValue;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  const Icon = POSITION_ICON[position];
  return (
    <button
      onClick={onClick}
      className={`relative flex w-[200px] flex-col items-center gap-3 rounded-[12px] border p-5 transition-colors ${
        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
      } ${locked ? "cursor-not-allowed" : ""}`}
    >
      {locked && (
        <span className="absolute left-2.5 top-2.5 text-text-dim">
          <Lock size={14} />
        </span>
      )}
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
        <Icon size={20} className="text-accent" />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[15px] font-black text-text" dir="auto">
          {POSITION_LABEL_FA[position]}
        </p>
        <p className="text-[11px] text-text-dim">{POSITION_LABEL[position].split(" - ")[0]}</p>
      </div>
    </button>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-end gap-2">
        <p className="text-[20px] font-black text-text" dir="auto">
          {title}
        </p>
        <p className="text-right text-[14px] text-text-dim" dir="auto">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}
