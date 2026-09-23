"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flag, ImagePlus, Video, X } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import {
  EVIDENCE_IMAGE_TYPES,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_IMAGE_BYTES,
  EVIDENCE_MAX_VIDEO_BYTES,
  EVIDENCE_MAX_VIDEO_SECONDS,
  EVIDENCE_VIDEO_TYPES,
  REPORT_CATEGORY_LABEL,
  REPORT_REASONS,
  type ReportCategoryValue,
  type ReportReasonValue,
} from "@/app/lib/behavior";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

interface ReportMatch {
  matchId: string;
  heroName: string;
  heroIcon: string;
  win: boolean;
  startAt: string;
  duration: number;
  shared: boolean;
}

interface Evidence {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

const ACCEPT = [...Object.keys(EVIDENCE_IMAGE_TYPES), ...Object.keys(EVIDENCE_VIDEO_TYPES)].join(",");

function readVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video.duration);
    video.onerror = () => resolve(Number.NaN);
    video.src = url;
  });
}

export function ReportPlayerModal({
  open,
  onOpenChange,
  player,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: { id: number; displayName: string };
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<ReportCategoryValue>("BEHAVIOR");
  const [reasonCode, setReasonCode] = useState<ReportReasonValue | null>(null);
  const [matches, setMatches] = useState<ReportMatch[] | null>(null);
  const [matchId, setMatchId] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || matches) return;
    fetch(`/api/users/${player.id}/report-matches`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setMatches(json.status === "success" ? json.data.matches : []));
  }, [open, matches, player.id]);

  // Revoke preview blobs if the profile page unmounts with the modal open.
  const evidenceRef = useRef(evidence);
  useEffect(() => {
    evidenceRef.current = evidence;
  }, [evidence]);
  useEffect(() => () => evidenceRef.current.forEach((e) => URL.revokeObjectURL(e.previewUrl)), []);

  function reset() {
    evidence.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setCategory("BEHAVIOR");
    setReasonCode(null);
    setMatchId("");
    setDescription("");
    setEvidence([]);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const next = [...evidence];

    for (const file of Array.from(list)) {
      if (next.length >= EVIDENCE_MAX_FILES) {
        toast.error("حداکثر ۴ فایل می‌تونی بفرستی.");
        break;
      }
      const isVideo = file.type in EVIDENCE_VIDEO_TYPES;
      const isImage = file.type in EVIDENCE_IMAGE_TYPES;
      if (!isVideo && !isImage) {
        toast.error(`فرمت «${file.name}» مجاز نیست.`);
        continue;
      }
      if (isVideo && next.some((e) => e.isVideo)) {
        toast.error("فقط یک ویدیو می‌تونی بفرستی.");
        continue;
      }
      if (file.size > (isVideo ? EVIDENCE_MAX_VIDEO_BYTES : EVIDENCE_MAX_IMAGE_BYTES)) {
        toast.error(isVideo ? "حجم ویدیو نباید بیشتر از ۳۰ مگابایت باشد." : "حجم هر عکس نباید بیشتر از ۵ مگابایت باشد.");
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      if (isVideo) {
        const seconds = await readVideoDuration(previewUrl);
        if (!(seconds <= EVIDENCE_MAX_VIDEO_SECONDS + 0.5)) {
          URL.revokeObjectURL(previewUrl);
          toast.error("ویدیو باید حداکثر ۱۰ ثانیه باشد.");
          continue;
        }
      }
      next.push({ file, previewUrl, isVideo });
    }

    setEvidence(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeEvidence(index: number) {
    URL.revokeObjectURL(evidence[index].previewUrl);
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = reasonCode !== null && /^\d{6,20}$/.test(matchId.trim()) && description.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !reasonCode) return;
    setSubmitting(true);

    const form = new FormData();
    form.set("reportedUserId", String(player.id));
    form.set("reasonCode", reasonCode);
    form.set("matchId", matchId.trim());
    form.set("description", description.trim());
    evidence.forEach((e) => form.append("files", e.file));

    try {
      const res = await fetch("/api/reports", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (json?.status === "success") {
        toast.success(json.message);
        reset();
        onOpenChange(false);
      } else {
        toast.error(json?.message ?? "ثبت گزارش ناموفق بود.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const reasons = REPORT_REASONS.filter((r) => r.category === category);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto border-border bg-surface p-0 sm:max-w-lg"
        dir="rtl"
        showCloseButton={false}
      >
        <div className="flex w-full items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-danger" />
            <DialogTitle className="text-[16px] font-black text-text" dir="auto">
              گزارش {player.displayName}
            </DialogTitle>
          </div>
          <DialogClose className="flex size-8 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <X size={16} />
            <span className="sr-only">بستن</span>
          </DialogClose>
        </div>

        <div className="flex w-full flex-col gap-5 px-6 py-5">
          <DialogDescription className="text-right text-[12px] leading-[1.7] text-text-dim" dir="auto">
            گزارش بعد از بررسی پشتیبانی و در صورت تایید، امتیاز رفتار یا ارتباطات این بازیکن رو کم می‌کنه. گزارش الکی
            ممکنه به حساب خودت آسیب بزنه.
          </DialogDescription>

          <Section title="نوع تخلف">
            <div className="grid w-full grid-cols-2 gap-2">
              {(Object.keys(REPORT_CATEGORY_LABEL) as ReportCategoryValue[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setReasonCode(null);
                  }}
                  className={`rounded-[8px] px-3 py-2.5 text-[13px] font-bold transition-colors ${
                    category === c ? "bg-primary text-white" : "border border-border bg-surface-alt text-text-dim hover:text-text"
                  }`}
                  dir="auto"
                >
                  {REPORT_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </Section>

          <Section title="دلیل گزارش">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {reasons.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReasonCode(r.value)}
                  aria-pressed={reasonCode === r.value}
                  className={`flex flex-col items-start gap-0.5 rounded-[8px] border p-3 text-right transition-colors ${
                    reasonCode === r.value
                      ? "border-danger bg-danger/[0.12]"
                      : "border-border bg-surface-alt hover:border-white/20"
                  }`}
                >
                  <span className="text-[13px] font-bold text-text" dir="auto">
                    {r.label}
                  </span>
                  <span className="text-[11px] text-text-dim" dir="auto">
                    {r.hint}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="مچ مربوطه">
            {matches === null ? (
              <p className="w-full py-2 text-center text-[12px] text-text-dim">در حال بارگذاری مچ‌ها...</p>
            ) : matches.length > 0 ? (
              <div className="flex max-h-48 w-full flex-col gap-1.5 overflow-y-auto">
                {matches.map((m) => (
                  <button
                    key={m.matchId}
                    type="button"
                    onClick={() => setMatchId(m.matchId)}
                    className={`flex w-full items-center justify-between gap-2 rounded-[8px] border p-2.5 transition-colors ${
                      matchId === m.matchId ? "border-accent bg-accent/10" : "border-transparent bg-surface-alt hover:border-white/15"
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
                      {m.shared && (
                        <span className="rounded-[4px] bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success" dir="auto">
                          بازی مشترک
                        </span>
                      )}
                      <span className="text-[11px] text-text-dim" dir="ltr">
                        #{m.matchId}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
                مچ اخیری از حسابت پیدا نشد — شناسه مچ رو دستی وارد کن.
              </p>
            )}
            <input
              value={matchId}
              onChange={(e) => setMatchId(e.target.value.replace(/\D/g, "").slice(0, 20))}
              inputMode="numeric"
              placeholder="یا شناسه مچ (Match ID) رو وارد کن"
              className="w-full rounded-[8px] border border-border bg-surface-alt px-3 py-2.5 text-[13px] text-text placeholder:text-right placeholder:text-text-dim/60 focus:border-accent focus:outline-none"
              dir="ltr"
            />
          </Section>

          <Section title="توضیحات">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="چه اتفاقی افتاد؟ دقیقه‌ی تقریبی بازی رو هم بنویس تا بررسی سریع‌تر باشه."
              className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text placeholder:text-text-dim/60 focus:border-accent focus:outline-none"
              dir="auto"
            />
            <p className="w-full text-left text-[10px] text-text-dim" dir="ltr">
              {description.length}/1000
            </p>
          </Section>

          <Section title="مدرک (اختیاری)">
            <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
              تا ۴ فایل: عکس (حداکثر ۵ مگابایت) و یا ویدیو تا ۱۰ ثانیه.
            </p>
            <div className="grid w-full grid-cols-4 gap-2">
              {evidence.map((e, i) => (
                <div key={e.previewUrl} className="relative aspect-square overflow-hidden rounded-[8px] border border-border bg-surface-alt">
                  {e.isVideo ? (
                    <>
                      <video src={e.previewUrl} className="h-full w-full object-cover" muted />
                      <Video size={14} className="absolute bottom-1.5 right-1.5 text-white drop-shadow" />
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidence(i)}
                    className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-bg/70 text-white hover:bg-bg"
                    aria-label="حذف فایل"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {evidence.length < EVIDENCE_MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-border bg-surface-alt text-text-dim transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px]" dir="auto">
                    افزودن
                  </span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </Section>
        </div>

        <div className="flex w-full items-center gap-3 border-t border-border px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-[8px] bg-danger py-2.5 text-[13px] font-bold text-white hover:bg-danger/90 disabled:opacity-50"
            dir="auto"
          >
            {submitting ? "در حال ارسال..." : "ثبت گزارش"}
          </button>
          <button
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="flex-1 rounded-[8px] border border-border bg-surface-alt py-2.5 text-[13px] font-bold text-text hover:bg-white/5"
            dir="auto"
          >
            انصراف
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="w-full text-right text-[13px] font-bold text-text" dir="auto">
        {title}
      </p>
      {children}
    </div>
  );
}
