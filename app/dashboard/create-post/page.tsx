"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { Switch } from "@/components/ui/switch";
import { POSITIONS, POSITION_ICON, POSITION_LABEL, POSITION_LABEL_FA, type PositionValue } from "@/components/dashboard/positionMeta";
import { RANK_OPTIONS, REGION_OPTIONS, GAME_MODE_OPTIONS, RANK_LABEL, REGION_LABEL } from "@/components/dashboard/postLabels";

const STEPS = ["نقش", "رنک", "حالت بازی", "منطقه", "نوع جلسه", "جزئیات"];

export default function CreatePostPage() {
  const router = useRouter();
  const [checkingActive, setCheckingActive] = useState(true);
  const [hasActivePost, setHasActivePost] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const [step, setStep] = useState(1);
  const [position, setPosition] = useState<PositionValue | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const [rankTier, setRankTier] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"NOW" | "SCHEDULED">("NOW");
  const [startAt, setStartAt] = useState("");
  const [partySize, setPartySize] = useState(5);
  const [hasVoice, setHasVoice] = useState(true);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/home", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setHasActivePost(json.data.activePostCount > 0);
          setDisplayName(json.data.user.displayName);
        }
      })
      .finally(() => setCheckingActive(false));
  }, []);

  const canContinue =
    (step === 1 && position) ||
    (step === 2 && rank) ||
    (step === 3 && gameMode) ||
    (step === 4 && region) ||
    (step === 5 && (sessionType === "NOW" || startAt)) ||
    step === 6;

  async function handleSubmit() {
    setError(null);
    if (description.trim().length < 10) {
      setError("توضیحات پست باید حداقل ۱۰ کاراکتر باشه.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          rank,
          gameMode,
          region,
          sessionType,
          startAt: sessionType === "SCHEDULED" ? startAt : null,
          partySize,
          hasVoice,
          description: description.trim(),
        }),
      });
      const json = await res.json();
      if (json.status !== "success") {
        setError(json.message ?? "خطایی پیش اومد.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard/my-posts");
      router.refresh();
    } catch {
      setError("مشکلی در ارتباط با سرور پیش اومد.");
      setSubmitting(false);
    }
  }

  if (checkingActive) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  if (hasActivePost) {
    return (
      <div className="flex w-full flex-col gap-6 p-6 md:p-10">
        <Card tone="surface" noHover className="w-full items-center gap-3 p-10 text-center">
          <AlertTriangle size={32} className="text-danger" />
          <p className="text-[16px] font-black text-text" dir="auto">
            فقط یک پست فعال می‌تونی داشته باشی
          </p>
          <p className="text-[13px] text-text-dim" dir="auto">
            برای ساختن پست جدید، اول پست فعلیت رو ببند یا کامل کن.
          </p>
          <a
            href="/dashboard/my-posts"
            className="mt-2 rounded-[8px] bg-primary px-6 py-3 text-[13px] font-bold text-white hover:bg-primary-hover"
          >
            رفتن به پست‌های من
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex w-full items-center justify-between rounded-[8px] bg-danger-soft px-6 py-3">
        <AlertTriangle size={16} className="text-[#ffa1a1]" />
        <p className="text-[13px] font-bold text-[#ffa1a1]" dir="auto">
          فقط یک پست فعال می‌تونی داشته باشی
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-6 py-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-border" />}
              <span className={`text-[14px] ${active ? "text-text" : "text-text-dim"}`} dir="auto">
                {label}
              </span>
              <div
                className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                  active || done ? "bg-primary text-white" : "border border-border bg-surface text-white"
                }`}
              >
                {done ? <Check size={12} /> : n}
              </div>
            </div>
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
                      {rank ? RANK_LABEL[rank] : "—"} {rankTier ?? ""}
                    </p>
                  </div>
                  <div className="rounded-full border-[1.5px] border-success">
                    <HeroAvatar name={displayName || "شما"} size={36} round />
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col items-end gap-1.5">
                <p className="text-[13px] font-bold text-text-dim" dir="auto">
                  {position ? POSITION_LABEL[position] : "پوزیشن انتخاب نشده"}
                </p>
                <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
                  {description || "توضیحات تکمیلی پست در این قسمت نمایش داده خواهد شد..."}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                <span className="rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                  {region ? REGION_LABEL[region] : "منطقه"}
                </span>
                <span className="rounded-[4px] bg-surface px-2 py-0.5 text-[11px] text-accent" dir="auto">
                  پارتی: ۱/{partySize}
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
                {POSITIONS.map((p) => {
                  const Icon = POSITION_ICON[p];
                  const active = position === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPosition(p)}
                      className={`flex w-[200px] flex-col items-center gap-3 rounded-[12px] border p-5 transition-colors ${
                        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                      }`}
                    >
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
                        <Icon size={20} className="text-accent" />
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <p className="text-[15px] font-black text-text" dir="auto">
                          {POSITION_LABEL_FA[p]}
                        </p>
                        <p className="text-[11px] text-text-dim">{POSITION_LABEL[p].split(" - ")[0]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="رنکت رو مشخص کن" subtitle="رنک فعلی که تو این پست نمایش داده می‌شه">
              <div className="flex flex-wrap gap-4">
                {RANK_OPTIONS.map((r) => {
                  const active = rank === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setRank(r.value)}
                      className={`flex w-[130px] flex-col items-center gap-2 rounded-[12px] border p-4 transition-colors ${
                        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                      }`}
                    >
                      <p className="text-[14px] font-black text-text">{r.label}</p>
                    </button>
                  );
                })}
              </div>
              {rank && rank !== "IMMORTAL" && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    ستاره:
                  </span>
                  {[1, 2, 3, 4, 5].map((t) => (
                    <button
                      key={t}
                      onClick={() => setRankTier(t)}
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

          {step === 3 && (
            <StepShell title="حالت بازی رو انتخاب کن" subtitle="این لابی برای کدوم گیم‌مود تشکیل می‌شه">
              <div className="flex flex-wrap gap-4">
                {GAME_MODE_OPTIONS.map((m) => {
                  const active = gameMode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setGameMode(m.value)}
                      className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                      }`}
                    >
                      <p className="text-[14px] font-black text-text">{m.label}</p>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="منطقه سرور رو انتخاب کن" subtitle="ریجنی که معمولاً توش بازی می‌کنی">
              <div className="flex flex-wrap gap-4">
                {REGION_OPTIONS.map((rg) => {
                  const active = region === rg.value;
                  return (
                    <button
                      key={rg.value}
                      onClick={() => setRegion(rg.value)}
                      className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                        active ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                      }`}
                    >
                      <p className="text-[14px] font-black text-text" dir="auto">
                        {rg.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="نوع جلسه رو مشخص کن" subtitle="همین الان دنبال هم‌تیمی هستی یا برای بعداً برنامه می‌چینی؟">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setSessionType("NOW")}
                  className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                    sessionType === "NOW" ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                  }`}
                >
                  <p className="text-[14px] font-black text-text" dir="auto">
                    همین الان
                  </p>
                </button>
                <button
                  onClick={() => setSessionType("SCHEDULED")}
                  className={`flex w-[200px] flex-col items-center gap-2 rounded-[12px] border p-5 transition-colors ${
                    sessionType === "SCHEDULED" ? "border-accent bg-primary/15" : "border-border bg-surface hover:border-white/20"
                  }`}
                >
                  <p className="text-[14px] font-black text-text" dir="auto">
                    زمان‌بندی‌شده
                  </p>
                </button>
              </div>

              {sessionType === "SCHEDULED" && (
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text focus:outline-none"
                  dir="ltr"
                />
              )}

              <div className="flex w-full flex-wrap items-center justify-end gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    وویس دارم
                  </span>
                  <Switch checked={hasVoice} onChange={setHasVoice} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-dim" dir="auto">
                    اندازه پارتی:
                  </span>
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPartySize(n)}
                      className={`flex size-8 items-center justify-center rounded-[6px] text-[12px] font-bold ${
                        partySize === n ? "bg-primary text-white" : "border border-border bg-surface text-text-dim"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="جزئیات پست" subtitle="یه توضیح کوتاه بنویس تا بقیه بدونن دنبال چی هستی">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="مثلاً: دنبال هارد ساپورت رنک بالا و با وویس دیسکورد..."
                dir="auto"
                className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-4 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
              />
              {error && (
                <p className="text-sm text-red-400" dir="auto">
                  {error}
                </p>
              )}
            </StepShell>
          )}

          <div className="flex w-full gap-3 pt-2">
            {step < 6 ? (
              <button
                disabled={!canContinue}
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                className="flex flex-1 items-center justify-center rounded-[8px] bg-primary px-8 py-3.5 text-[14px] font-bold text-white transition-opacity hover:bg-primary-hover disabled:opacity-40"
                dir="auto"
              >
                ادامه و مرحله بعد
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="flex flex-1 items-center justify-center rounded-[8px] bg-primary px-8 py-3.5 text-[14px] font-bold text-white transition-opacity hover:bg-primary-hover disabled:opacity-60"
                dir="auto"
              >
                {submitting ? "در حال ساخت..." : "ایجاد پست"}
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
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-end gap-2">
        <p className="text-[20px] font-black text-text" dir="auto">
          {title}
        </p>
        <p className="text-[14px] text-text-dim" dir="auto">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}
