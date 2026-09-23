"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, UserX, CheckCircle, MessageSquareText, ChevronDown, Swords, Paperclip } from "lucide-react";

import { Card } from "@/components/general/card";

interface AdminReport {
  id: number;
  reportedUserName: string;
  reportedUserId: number | null;
  reporterName: string;
  severity: string;
  severityLabel: string;
  context: string;
  hasConversation: boolean;
  reason: string;
  category: "BEHAVIOR" | "COMMUNICATION" | null;
  reasonCode: string | null;
  reasonLabel: string | null;
  defaultPenalty: number | null;
  scorePenalty: number | null;
  matchId: string | null;
  attachments: { id: number; kind: "IMAGE" | "VIDEO" }[];
  reportedUserScores: { behavior: number; communication: number } | null;
  status: string;
  action: string;
  createdAt: string;
}

interface ReportMatchPlayer {
  isRadiant: boolean;
  personaName: string | null;
  heroName: string;
  heroIcon: string;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  goldPerMin: number;
  heroDamage: number;
  abandoned: boolean;
  items: string[];
  isReporter: boolean;
  isReported: boolean;
}

interface ReportMatch {
  matchId: string;
  radiantWin: boolean;
  duration: number;
  startAt: string | null;
  radiantScore: number;
  direScore: number;
  players: ReportMatchPlayer[];
}

const ACTION_RESULT_LABEL: Record<string, string> = {
  BANNED: "مسدود شد",
  SUSPENDED: "تعلیق شد",
  SCORE_REDUCED: "تایید شد",
  DISMISSED: "رد شد",
};

interface ReportMessage {
  id: number;
  body: string;
  createdAt: string;
  senderId: number;
  senderName: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "border-border bg-surface-alt text-text-dim",
  MEDIUM: "border-success bg-success/[0.13] text-success",
  HIGH: "border-[#ff9f0a] bg-[#ff9f0a]/[0.12] text-[#ff9f0a]",
  CRITICAL: "border-danger bg-danger/[0.12] text-danger",
};

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${Math.floor(hours / 24)} روز پیش`;
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [counts, setCounts] = useState({ pending: 0, banned: 0, reviewedToday: 0 });
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Record<number, ReportMessage[]>>({});
  const [conversationLoadingId, setConversationLoadingId] = useState<number | null>(null);
  const [matchOpenId, setMatchOpenId] = useState<number | null>(null);
  const [reportMatches, setReportMatches] = useState<Record<number, ReportMatch | "error">>({});
  const [penalties, setPenalties] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    return fetch(`/api/admin/reports?tab=${tab}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setCounts(json.data.counts);
          setReports(json.data.reports);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleConversation(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (conversations[id]) return;

    setConversationLoadingId(id);
    const res = await fetch(`/api/admin/reports/${id}/messages`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (json?.status === "success") {
      setConversations((prev) => ({ ...prev, [id]: json.data.messages }));
    }
    setConversationLoadingId(null);
  }

  async function toggleMatch(id: number) {
    if (matchOpenId === id) {
      setMatchOpenId(null);
      return;
    }
    setMatchOpenId(id);
    if (reportMatches[id]) return;

    const res = await fetch(`/api/admin/reports/${id}/match`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    setReportMatches((prev) => ({ ...prev, [id]: json?.status === "success" ? json.data : "error" }));
  }

  async function act(id: number, action: "confirm" | "ban" | "suspend" | "dismiss") {
    setBusyId(id);
    const penalty = penalties[id];
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(penalty !== undefined && penalty !== "" ? { penalty: Number(penalty) } : {}) }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={AlertTriangle} label="گزارش‌های در انتظار" value={counts.pending} note={`${counts.pending} مورد جدید`} noteCls="text-[#ff9f0a]" />
        <KpiCard icon={UserX} label="کاربران مسدود شده" value={counts.banned} note="مجموع کل" noteCls="text-danger" />
        <KpiCard icon={CheckCircle} label="بررسی شده امروز" value={counts.reviewedToday} note="بایگانی فعال" noteCls="text-success" />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("reviewed")}
            className={`whitespace-nowrap rounded-[8px] px-5 py-2.5 text-[14px] font-bold ${
              tab === "reviewed" ? "bg-primary text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            بررسی‌شده
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`whitespace-nowrap rounded-[8px] px-5 py-2.5 text-[14px] font-bold ${
              tab === "pending" ? "bg-primary text-white" : "border border-border text-text-dim"
            }`}
            dir="auto"
          >
            در انتظار بررسی ({counts.pending})
          </button>
        </div>
        <p className="text-[16px] font-bold text-text" dir="auto">
          لیست گزارش‌های اخیر کاربران در لابی و چت
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {loading ? (
          <div className="flex h-40 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
        ) : reports.length === 0 ? (
          <Card tone="surface" noHover className="w-full items-center p-8 text-center">
            <p className="text-[13px] text-text-dim" dir="auto">
              {tab === "pending" ? "گزارش بازی برای بررسی نیست." : "گزارش بررسی‌شده‌ای نیست."}
            </p>
          </Card>
        ) : (
          reports.map((r) => (
            <Card key={r.id} tone="surface" noHover className="w-full gap-4 p-5">
              <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-dim" dir="auto">
                      کاربر متخلف:
                    </span>
                    <span className="text-[15px] font-black text-text" dir="auto">
                      {r.reportedUserName}
                    </span>
                  </div>
                  <div className="hidden h-4 w-px bg-border sm:block" />
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-dim" dir="auto">
                      گزارش‌دهنده:
                    </span>
                    <span className="text-[14px] font-bold text-text-dim" dir="auto">
                      {r.reporterName}
                    </span>
                  </div>
                  <div className="hidden h-4 w-px bg-border sm:block" />
                  <span className={`rounded-[6px] border px-2.5 py-1 text-[12px] font-black ${SEVERITY_STYLE[r.severity]}`} dir="auto">
                    {r.severityLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="whitespace-nowrap text-[13px] text-text-dim">{timeAgo(r.createdAt)}</p>
                  <span className="whitespace-nowrap rounded-[4px] bg-surface-alt px-2 py-1 text-[11px] text-accent" dir="auto">
                    {r.context}
                  </span>
                </div>
              </div>

              {r.reasonLabel && (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <span className="rounded-[6px] border border-danger/50 bg-danger/[0.1] px-2.5 py-1 text-[12px] font-black text-danger" dir="auto">
                    {r.reasonLabel}
                  </span>
                  {r.reportedUserScores && (
                    <span className="text-[12px] text-text-dim" dir="auto">
                      امتیاز فعلی {r.category === "COMMUNICATION" ? "ارتباطات" : "رفتار"}:{" "}
                      <span className="font-bold text-text">
                        {(r.category === "COMMUNICATION" ? r.reportedUserScores.communication : r.reportedUserScores.behavior).toLocaleString("fa-IR")}
                      </span>
                    </span>
                  )}
                </div>
              )}

              <p className="w-full text-right text-[14px] leading-[1.6] text-text-dim" dir="auto">
                {r.reasonLabel ? "توضیحات" : "علت گزارش"}: {r.reason}
              </p>

              {r.attachments.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-text-dim" dir="auto">
                    <Paperclip size={13} />
                    مدارک ارسالی ({r.attachments.length.toLocaleString("fa-IR")})
                  </p>
                  <div className="flex w-full flex-wrap gap-2">
                    {r.attachments.map((a) => {
                      const src = `/api/admin/reports/${r.id}/attachments/${a.id}`;
                      return a.kind === "VIDEO" ? (
                        <video key={a.id} src={src} controls preload="metadata" className="h-40 max-w-full rounded-[8px] border border-border bg-black" />
                      ) : (
                        <a key={a.id} href={src} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="مدرک گزارش" className="h-40 w-auto max-w-full rounded-[8px] border border-border object-cover transition-opacity hover:opacity-85" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {r.matchId && (
                <div className="w-full">
                  <button
                    onClick={() => toggleMatch(r.id)}
                    className="flex w-full items-center justify-between rounded-[6px] border border-border bg-surface-alt px-3 py-2 text-[12px] font-bold text-accent"
                    dir="auto"
                  >
                    <ChevronDown size={14} className={`transition-transform ${matchOpenId === r.id ? "rotate-180" : ""}`} />
                    <span className="flex items-center gap-1.5">
                      <Swords size={13} />
                      مشاهده مچ <span dir="ltr">#{r.matchId}</span>
                    </span>
                  </button>

                  {matchOpenId === r.id && <MatchScoreboard match={reportMatches[r.id]} matchId={r.matchId} />}
                </div>
              )}

              {r.hasConversation && (
                <div className="w-full">
                  <button
                    onClick={() => toggleConversation(r.id)}
                    className="flex w-full items-center justify-between rounded-[6px] border border-border bg-surface-alt px-3 py-2 text-[12px] font-bold text-accent"
                    dir="auto"
                  >
                    <ChevronDown size={14} className={`transition-transform ${expandedId === r.id ? "rotate-180" : ""}`} />
                    <span className="flex items-center gap-1.5">
                      <MessageSquareText size={13} />
                      مشاهده گفتگو
                    </span>
                  </button>

                  {expandedId === r.id && (
                    <div className="mt-2 flex max-h-72 w-full flex-col gap-2 overflow-y-auto rounded-[8px] border border-border bg-surface-alt/50 p-3">
                      {conversationLoadingId === r.id ? (
                        <p className="w-full text-center text-[12px] text-text-dim">در حال بارگذاری گفتگو...</p>
                      ) : !conversations[r.id]?.length ? (
                        <p className="w-full text-center text-[12px] text-text-dim">پیامی پیدا نشد.</p>
                      ) : (
                        conversations[r.id].map((m) => (
                          <div
                            key={m.id}
                            className={`flex w-full flex-col gap-1 rounded-[8px] border p-2.5 ${
                              m.senderId === r.reportedUserId ? "border-danger/30 bg-danger/[0.07]" : "border-border bg-surface"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <p className="text-[10px] text-text-dim">{new Date(m.createdAt).toLocaleString("fa-IR")}</p>
                              <p className={`text-[11px] font-bold ${m.senderId === r.reportedUserId ? "text-danger" : "text-text"}`} dir="auto">
                                {m.senderName}
                                {m.senderId === r.reportedUserId ? " (کاربر متخلف)" : ""}
                              </p>
                            </div>
                            <p className="w-full text-right text-[13px] text-text" dir="auto">
                              {m.body}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex w-full flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                {tab === "pending" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {r.reasonCode && (
                      <>
                        <button
                          disabled={busyId === r.id || !r.reportedUserId}
                          onClick={() => act(r.id, "confirm")}
                          className="whitespace-nowrap rounded-[6px] border border-success bg-success/[0.13] px-3.5 py-2 text-[13px] font-bold text-success disabled:opacity-40"
                          dir="auto"
                        >
                          تایید و کسر امتیاز
                        </button>
                        <label className="flex items-center gap-1.5 text-[12px] text-text-dim" dir="auto">
                          مقدار کسر:
                          <input
                            type="number"
                            min={0}
                            max={12000}
                            step={50}
                            value={penalties[r.id] ?? String(r.defaultPenalty ?? 0)}
                            onChange={(e) => setPenalties((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            className="w-20 rounded-[6px] border border-border bg-surface-alt px-2 py-1.5 text-center text-[13px] text-text focus:border-accent focus:outline-none"
                            dir="ltr"
                          />
                        </label>
                        <div className="hidden h-6 w-px bg-border sm:block" />
                      </>
                    )}
                    <button
                      disabled={busyId === r.id || !r.reportedUserId}
                      onClick={() => act(r.id, "ban")}
                      className="whitespace-nowrap rounded-[6px] border border-danger bg-danger px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                      dir="auto"
                    >
                      مسدود کردن (Ban)
                    </button>
                    <button
                      disabled={busyId === r.id || !r.reportedUserId}
                      onClick={() => act(r.id, "suspend")}
                      className="whitespace-nowrap rounded-[6px] border border-[#ff9f0a] bg-[#ff9f0a]/[0.12] px-3.5 py-2 text-[13px] font-bold text-[#ff9f0a] disabled:opacity-40"
                      dir="auto"
                    >
                      تعلیق موقت
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, "dismiss")}
                      className="whitespace-nowrap rounded-[6px] border border-border px-3.5 py-2 text-[13px] font-bold text-text disabled:opacity-40"
                      dir="auto"
                    >
                      رد گزارش
                    </button>
                  </div>
                ) : (
                  <span className="text-[12px] text-text-dim" dir="auto">
                    نتیجه: {ACTION_RESULT_LABEL[r.action] ?? "رد شد"}
                    {r.scorePenalty ? ` · ${r.scorePenalty.toLocaleString("fa-IR")} امتیاز کسر شد` : ""}
                  </span>
                )}
                <p className="text-[13px] text-text-dim" dir="auto">
                  شناسه پیگیری: #{r.id}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function MatchScoreboard({ match, matchId }: { match: ReportMatch | "error" | undefined; matchId: string }) {
  if (!match) {
    return <p className="mt-2 w-full text-center text-[12px] text-text-dim">در حال دریافت مچ از OpenDota...</p>;
  }
  if (match === "error") {
    return (
      <p className="mt-2 w-full text-center text-[12px] text-text-dim" dir="auto">
        جزئیات این مچ پیدا نشد — ممکنه شناسه اشتباه باشه یا OpenDota هنوز پارسش نکرده.
      </p>
    );
  }

  const teams = [
    { label: "Radiant", won: match.radiantWin, score: match.radiantScore, players: match.players.filter((p) => p.isRadiant) },
    { label: "Dire", won: !match.radiantWin, score: match.direScore, players: match.players.filter((p) => !p.isRadiant) },
  ];
  const anyIdentified = match.players.some((p) => p.isReporter || p.isReported);

  return (
    <div className="mt-2 flex w-full flex-col gap-3 rounded-[8px] border border-border bg-surface-alt/50 p-3">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 text-[11px] text-text-dim">
        <a href={`https://www.opendota.com/matches/${matchId}`} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline" dir="auto">
          مشاهده در OpenDota
        </a>
        <span dir="auto">
          {match.startAt ? new Date(match.startAt).toLocaleString("fa-IR") : ""} · {Math.floor(match.duration / 60)}:
          {String(match.duration % 60).padStart(2, "0")}
        </span>
      </div>

      {!anyIdentified && (
        <p className="w-full rounded-[6px] bg-[#ff9f0a]/[0.1] p-2 text-right text-[11px] text-[#ff9f0a]" dir="auto">
          هیچ‌کدوم از دو طرف توی این مچ شناسایی نشدن — یا اطلاعات مچشون خصوصیه یا واقعاً توی این بازی نبودن.
        </p>
      )}

      {teams.map((team) => (
        <div key={team.label} className="flex w-full flex-col gap-1.5">
          <div className="flex w-full items-center justify-between text-[12px] font-bold" dir="ltr">
            <span className={team.won ? "text-success" : "text-text-dim"}>
              {team.label} · {team.score}
              {team.won ? " · WIN" : ""}
            </span>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]" dir="ltr">
              <tbody>
                {team.players.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-t border-border ${
                      p.isReported ? "bg-danger/[0.1]" : p.isReporter ? "bg-accent/[0.1]" : ""
                    }`}
                  >
                    <td className="py-1.5 pl-1.5">
                      <div className="flex items-center gap-2">
                        {p.heroIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.heroIcon} alt="" className="size-6 shrink-0 rounded-[4px]" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-text">{p.heroName}</span>
                          <span className="text-[10px] text-text-dim">{p.personaName ?? "Anonymous"}</span>
                        </div>
                        {p.isReported && (
                          <span className="rounded-[4px] bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white" dir="auto">
                            متخلف
                          </span>
                        )}
                        {p.isReporter && (
                          <span className="rounded-[4px] bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white" dir="auto">
                            گزارش‌دهنده
                          </span>
                        )}
                        {p.abandoned && (
                          <span className="rounded-[4px] bg-[#ff9f0a]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ff9f0a]">ABANDON</span>
                        )}
                      </div>
                    </td>
                    <td className={`py-1.5 text-center font-bold ${p.deaths >= 12 ? "text-danger" : "text-text"}`}>
                      {p.kills}/{p.deaths}/{p.assists}
                    </td>
                    <td className="py-1.5 text-center text-text-dim">{p.lastHits} LH</td>
                    <td className="py-1.5 text-center text-text-dim">{p.goldPerMin} GPM</td>
                    <td className="py-1.5 text-center text-text-dim">{p.heroDamage.toLocaleString()} DMG</td>
                    <td className="py-1.5 pr-1.5">
                      <div className="flex justify-end gap-0.5">
                        {p.items.map((img, j) =>
                          img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={j} src={img} alt="" className="h-5 w-7 rounded-[2px] object-cover" />
                          ) : null,
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  noteCls,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  note: string;
  noteCls: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-5">
      <div className="flex w-full items-center justify-between">
        <div className="flex size-6 items-center justify-center rounded-[6px] bg-surface-alt">
          <Icon size={14} className="text-text-dim" />
        </div>
        <p className="text-[13px] text-text-dim" dir="auto">
          {label}
        </p>
      </div>
      <div className="flex w-full items-baseline justify-between">
        <p className={`text-[11px] font-bold ${noteCls}`} dir="auto">
          {note}
        </p>
        <p className="text-[24px] font-black text-text">{value.toLocaleString("fa-IR")}</p>
      </div>
    </div>
  );
}
