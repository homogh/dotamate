"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, X } from "lucide-react";

import { useToast } from "@/app/stores/useToast";
import { COMMEND_TYPES, type CommendTypeValue } from "@/app/lib/behavior";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { SharedMatchPicker, type SharedMatchOption } from "@/components/pages/profile/sharedMatchPicker";

interface CommendOptions {
  blockedReason: string | null;
  remainingToday: number;
  notice: string | null;
  matches: SharedMatchOption[];
}

export function CommendPlayerModal({
  open,
  onOpenChange,
  player,
  onCommended,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: { id: number; displayName: string };
  onCommended: () => void;
}) {
  const toast = useToast();
  const [options, setOptions] = useState<CommendOptions | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [type, setType] = useState<CommendTypeValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/users/${player.id}/commend`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setOptions(json.status === "success" ? json.data : { blockedReason: json.message, remainingToday: 0, notice: null, matches: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, player.id]);

  function close() {
    setOptions(null);
    setMatchId(null);
    setType(null);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (next) onOpenChange(true);
    else close();
  }

  async function handleSubmit() {
    if (!matchId || !type) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${player.id}/commend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, type }),
      });
      const json = await res.json().catch(() => null);
      if (json?.status === "success") {
        toast.success(json.message);
        close();
        onCommended();
        return;
      }
      toast.error(json?.message ?? "ثبت کامند ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto border-border bg-surface p-0 sm:max-w-md" dir="rtl" showCloseButton={false}>
        <div className="flex w-full items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <ThumbsUp size={16} className="text-success" />
            <DialogTitle className="text-[16px] font-black text-text" dir="auto">
              کامند {player.displayName}
            </DialogTitle>
          </div>
          <DialogClose className="flex size-8 items-center justify-center rounded-full text-text-dim transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <X size={16} />
            <span className="sr-only">بستن</span>
          </DialogClose>
        </div>

        <div className="flex w-full flex-col gap-5 px-6 py-5">
          <DialogDescription className="text-right text-[12px] leading-[1.7] text-text-dim" dir="auto">
            مثل خود دوتا، فقط هم‌تیمی‌هایی که توی یه مچ کنار هم بودن می‌تونن همدیگه رو کامند کنن.
          </DialogDescription>

          {options === null ? (
            <p className="w-full py-6 text-center text-[12px] text-text-dim">در حال بررسی...</p>
          ) : options.blockedReason ? (
            <p className="w-full rounded-[8px] bg-[#ff9f0a]/[0.1] p-3 text-right text-[13px] leading-[1.7] text-[#ff9f0a]" dir="auto">
              {options.blockedReason}
            </p>
          ) : (
            <>
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full items-center justify-between">
                  <span className="text-[11px] text-text-dim" dir="auto">
                    {options.remainingToday.toLocaleString("fa-IR")} کامند امروز باقی مونده
                  </span>
                  <p className="text-[13px] font-bold text-text" dir="auto">
                    مچ‌های ۷ روز اخیر {player.displayName}
                  </p>
                </div>
                {options.matches.length === 0 && !options.notice ? (
                  <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
                    این بازیکن توی ۷ روز اخیر مچی نداشته.
                  </p>
                ) : (
                  <SharedMatchPicker
                    matches={options.matches}
                    notice={options.notice}
                    selected={matchId}
                    onSelect={setMatchId}
                    requireSameTeam
                    tone="success"
                  />
                )}
              </div>

              <div className="flex w-full flex-col gap-2">
                <p className="w-full text-right text-[13px] font-bold text-text" dir="auto">
                  به خاطر چی؟
                </p>
                <div className="grid w-full grid-cols-2 gap-2">
                  {COMMEND_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      aria-pressed={type === t.value}
                      className={`rounded-[8px] border px-3 py-2.5 text-[12px] font-bold transition-colors ${
                        type === t.value ? "border-success bg-success/[0.13] text-success" : "border-border bg-surface-alt text-text-dim hover:text-text"
                      }`}
                      dir="auto"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex w-full items-center gap-3 border-t border-border px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={!matchId || !type || submitting || !!options?.blockedReason}
            className="flex-1 rounded-[8px] bg-success py-2.5 text-[13px] font-bold text-white hover:bg-success/90 disabled:opacity-50"
            dir="auto"
          >
            {submitting ? "در حال بررسی مچ..." : "ثبت کامند"}
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
