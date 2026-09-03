"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/general/card";
import { Switch } from "@/components/ui/switch";
import { DashboardFadeIn } from "@/components/dashboard/fadeIn";

interface SessionItem {
  id: number;
  title: string;
  startAt: string | null;
  gameMode: string;
  memberCount: number;
  partySize: number;
  confirmed: boolean;
  hostName: string;
}

const REMINDER_OPTIONS = [5, 15, 30, 60];

function formatWhen(iso: string | null) {
  if (!iso) return "زمان نامشخص";
  const date = new Date(iso);
  const day = date.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" });
  const time = date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  return `${day} - ${time}`;
}

export default function SessionsPage() {
  const [hosted, setHosted] = useState<SessionItem[]>([]);
  const [joined, setJoined] = useState<SessionItem[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/dashboard/sessions", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setHosted(json.data.hosted);
          setJoined(json.data.joined);
          setReminderEnabled(json.data.reminderEnabled);
          setReminderMinutes(json.data.reminderMinutes);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function saveReminder(enabled: boolean, minutes: number) {
    setReminderEnabled(enabled);
    setReminderMinutes(minutes);
    fetch("/api/dashboard/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderEnabled: enabled, reminderMinutes: minutes }),
    });
  }

  async function handleCancel(id: number) {
    if (!confirm("مطمئنی می‌خوای این جلسه رو لغو کنی؟")) return;
    setBusyId(id);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setBusyId(null);
    load();
  }

  async function handleComplete(id: number) {
    setBusyId(id);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    setBusyId(null);
    load();
  }

  async function handleLeave(id: number) {
    if (!confirm("مطمئنی می‌خوای از این جلسه خارج بشی؟")) return;
    setBusyId(id);
    await fetch(`/api/posts/${id}/leave`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  return (
    <div className="flex w-full flex-col gap-8 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-5">
        <div className="relative">
          <select
            value={reminderMinutes}
            onChange={(e) => saveReminder(reminderEnabled, Number(e.target.value))}
            className="appearance-none rounded-[8px] bg-surface-alt py-2 pl-8 pr-4 text-[13px] text-text focus:outline-none"
          >
            {REMINDER_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} دقیقه قبل
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-dim" dir="auto">
            یادآوری اعلان:
          </span>
          <Switch checked={reminderEnabled} onChange={(v) => saveReminder(v, reminderMinutes)} />
        </div>
      </Card>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
      ) : (
        <DashboardFadeIn ready={!loading} className="flex w-full flex-col gap-8">
          <div className="flex w-full flex-col gap-5">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              جلساتی که من میزبان هستم
            </p>
            {hosted.length === 0 ? (
              <Card tone="surface" noHover className="w-full items-center gap-2 p-8 text-center">
                <p className="text-[13px] text-text-dim" dir="auto">
                  هنوز جلسه‌ای زمان‌بندی نکردی.
                </p>
              </Card>
            ) : (
              <div className="flex w-full flex-col gap-3">
                {hosted.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    busy={busyId === s.id}
                    actions={
                      <>
                        <button
                          onClick={() => handleCancel(s.id)}
                          disabled={busyId === s.id}
                          className="rounded-[6px] bg-danger px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                          dir="auto"
                        >
                          لغو جلسه
                        </button>
                        <button
                          onClick={() => handleComplete(s.id)}
                          disabled={busyId === s.id}
                          className="rounded-[6px] border border-border bg-surface-alt px-4 py-2 text-[12px] font-bold text-text disabled:opacity-50"
                          dir="auto"
                        >
                          تکمیل شده
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-5">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              جلساتی که عضو شده‌ام
            </p>
            {joined.length === 0 ? (
              <Card tone="surface" noHover className="w-full items-center gap-2 p-8 text-center">
                <p className="text-[13px] text-text-dim" dir="auto">
                  هنوز به جلسه‌ای ملحق نشدی.
                </p>
              </Card>
            ) : (
              <div className="flex w-full flex-col gap-3">
                {joined.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    busy={busyId === s.id}
                    actions={
                      <button
                        onClick={() => handleLeave(s.id)}
                        disabled={busyId === s.id}
                        className="rounded-[6px] bg-danger px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                        dir="auto"
                      >
                        ترک جلسه
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </DashboardFadeIn>
      )}
    </div>
  );
}

function SessionRow({ session, actions }: { session: SessionItem; busy: boolean; actions: React.ReactNode }) {
  return (
    <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-2">{actions}</div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold text-white ${
                session.confirmed ? "bg-success" : "bg-danger"
              }`}
              dir="auto"
            >
              {session.confirmed ? "قطعی" : "در انتظار"}
            </span>
            <p className="text-[15px] font-black text-text" dir="auto">
              {session.title}
            </p>
          </div>
          <p className="text-[12px] text-text-dim" dir="auto">
            {formatWhen(session.startAt)} • میزبان: {session.hostName} • مود: {session.gameMode} • ظرفیت: {session.memberCount}/
            {session.partySize}
          </p>
        </div>
      </div>
    </Card>
  );
}
