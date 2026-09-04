"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { AuthShell } from "@/components/general/authShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Status {
  steamConnected: boolean;
  matchDataVerified: boolean;
  matchGateOverride: boolean;
  profileCompletedAt: string | null;
  steamName: string | null;
  steamAvatar: string | null;
}

const CALLBACK_ERROR_LABEL: Record<string, string> = {
  steam_verify_failed: "ورود با استیم تایید نشد، دوباره امتحان کن.",
  steam_already_linked: "این اکانت استیم قبلاً به یه حساب دیگه توی دوتامیت وصل شده.",
};

export function SteamConnect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const callbackError = searchParams.get("error");

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/onboarding/status", { cache: "no-store" });
    const json = await res.json();
    if (json.status === "success") {
      setStatus(json.data);
      return json.data as Status;
    }
    return null;
  }, []);

  const runVerify = useCallback(async () => {
    setVerifying(true);
    setVerifyMessage(null);
    const res = await fetch("/api/onboarding/steam/verify", { method: "POST" });
    const json = await res.json();
    setVerifying(false);
    setVerifyMessage(json.message ?? null);
    if (json.data?.verified) {
      setStatus((prev) => (prev ? { ...prev, matchDataVerified: true } : prev));
    }
    return Boolean(json.data?.verified);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadStatus();
      setLoading(false);
      if (data?.profileCompletedAt) {
        router.replace("/dashboard");
        return;
      }
      if (data?.steamConnected && !data.matchDataVerified && !data.matchGateOverride) {
        runVerify();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualConnect() {
    if (!manualInput.trim()) return;
    setManualBusy(true);
    setManualError(null);
    const res = await fetch("/api/onboarding/steam/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: manualInput.trim() }),
    });
    const json = await res.json();
    setManualBusy(false);
    if (json.status !== "success") {
      setManualError(json.message ?? "اتصال ناموفق بود.");
      return;
    }
    await loadStatus();
    runVerify();
  }

  const ready = status && (status.matchDataVerified || status.matchGateOverride);

  if (loading) {
    return (
      <AuthShell title="اتصال استیم" subtitle="در حال بررسی وضعیت حساب...">
        <div className="flex w-full items-center justify-center py-6">
          <Loader2 className="animate-spin text-text-dim" size={24} />
        </div>
      </AuthShell>
    );
  }

  if (ready) {
    return (
      <AuthShell title="استیم وصل شد" subtitle="اطلاعات مچ‌هات با موفقیت دریافت شد.">
        <div className="flex w-full flex-col items-center gap-4 py-4">
          <CheckCircle2 className="text-success" size={40} />
          {status?.steamName && (
            <p className="text-[15px] font-bold text-text" dir="auto">
              {status.steamName}
            </p>
          )}
          <Button className="w-full" onClick={() => router.push("/signup/profile")}>
            ادامه
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="اتصال پروفایل استیم"
      subtitle="این مرحله اجباریه — دوتامیت از روی رزومه‌ی واقعی بازی‌هات هم‌تیمی پیدا می‌کنه."
    >
      <div className="flex w-full flex-col gap-5">
        {callbackError && (
          <p className="w-full rounded-[8px] bg-danger/10 p-3 text-center text-xs text-danger" dir="auto">
            {CALLBACK_ERROR_LABEL[callbackError] ?? "مشکلی پیش اومد، دوباره امتحان کن."}
          </p>
        )}

        {status?.steamConnected ? (
          <div className="flex w-full flex-col items-center gap-4 rounded-[8px] border border-border bg-surface-alt p-5">
            {verifying ? (
              <>
                <Loader2 className="animate-spin text-text-dim" size={28} />
                <p className="text-center text-xs text-text-dim" dir="auto">
                  در حال بررسی اطلاعات مچ‌هات...
                </p>
              </>
            ) : (
              <>
                <XCircle className="text-danger" size={28} />
                <p className="text-center text-[13px] leading-[1.8] text-text" dir="auto">
                  {verifyMessage ?? "هنوز اطلاعات مچی پیدا نشد."}
                </p>
                <div className="w-full rounded-[8px] bg-surface p-3 text-right text-xs leading-[1.9] text-text-dim" dir="auto">
                  توی خود بازی دوتا برو به: Settings ← Options ← General، و گزینه‌ی{" "}
                  <span className="font-bold text-text">Expose Public Match Data</span> رو فعال کن. بعدش یه بازی جدید هم اگه
                  بازی کردی کمک می‌کنه سریع‌تر دیده بشه.
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={runVerify} disabled={verifying}>
                  بررسی مجدد
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <Button asChild className="w-full">
              <a href="/api/auth/steam/login">ورود با استیم</a>
            </Button>

            <div className="flex w-full items-center gap-3 text-xs text-text-dim">
              <div className="h-px flex-1 bg-border" />
              یا
              <div className="h-px flex-1 bg-border" />
            </div>

            {!showManual ? (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full text-center text-xs text-text-dim underline"
                dir="auto"
              >
                لینک پروفایل استیمم رو دستی وارد می‌کنم
              </button>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Label htmlFor="steamInput">لینک یا آیدی پروفایل استیم</Label>
                <Input
                  id="steamInput"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="https://steamcommunity.com/id/..."
                  dir="ltr"
                />
                {manualError && (
                  <p className="text-xs text-danger" dir="auto">
                    {manualError}
                  </p>
                )}
                <Button size="sm" className="w-full" onClick={handleManualConnect} disabled={manualBusy}>
                  {manualBusy ? "در حال اتصال..." : "اتصال"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AuthShell>
  );
}
