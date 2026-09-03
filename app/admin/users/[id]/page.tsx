"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Card } from "@/components/general/card";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { RANK_LABEL } from "@/components/dashboard/postLabels";
import { POSITION_LABEL, type PositionValue } from "@/components/dashboard/positionMeta";

interface UserDetail {
  id: number;
  displayName: string;
  email: string | null;
  country: string | null;
  languages: string | null;
  rank: string;
  rankTier: number | null;
  mainPosition: string | null;
  rankVerification: string;
  banned: boolean;
  banReason: string | null;
  suspendedUntil: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  roleId: number | null;
  roleName: string | null;
  roles: { id: number; name: string }[];
  posts: { id: number; description: string; status: string; gameMode: string; createdAt: string }[];
  reports: { id: number; reason: string; status: string; severity: string; reporterName: string; createdAt: string }[];
  auditLogs: { id: number; action: string; detail: string | null; actorName: string; createdAt: string }[];
}

const ACTION_LABEL: Record<string, string> = {
  BAN_USER: "مسدودسازی دائم",
  UNBAN_USER: "رفع مسدودیت",
  SUSPEND_USER: "تعلیق موقت",
  UNSUSPEND_USER: "رفع تعلیق",
  WARN_USER: "ارسال اخطار",
  VERIFY_USER: "تایید رنک",
  UNVERIFY_USER: "لغو تایید رنک",
  ASSIGN_ROLE: "تغییر نقش کاربری",
};

type Tab = "posts" | "sessions" | "reports" | "history";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/users/${params.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setUser(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/users/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy(false);
    load();
  }

  function handleRoleChange(value: string) {
    act("assignRole", { roleId: value ? Number(value) : null });
  }

  if (loading || !user) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/admin/users")} className="rounded-[8px] border border-border px-4 py-2 text-[13px] text-text">
          بازگشت
        </button>
        <div className="flex flex-1 items-center justify-end gap-2">
          <p className="text-[18px] font-black text-text" dir="auto">
            جزئیات کاربر
          </p>
          <ChevronLeft size={20} className="text-text-dim" />
          <p className="text-[18px] font-bold text-text-dim" dir="auto">
            / مدیریت کاربران
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col-reverse gap-6 lg:flex-row">
        <div className="flex w-full flex-col gap-5 lg:w-[340px] lg:shrink-0">
          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              نقش کاربری
            </p>
            <select
              disabled={busy}
              value={user.roleId ?? ""}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full rounded-[8px] border border-border bg-surface-alt p-3 text-[14px] text-text disabled:opacity-50"
              dir="auto"
            >
              <option value="">بدون نقش (کاربر عادی)</option>
              {user.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Card>

          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              عملیات نظارتی
            </p>
            <button
              disabled={busy}
              onClick={() => act("warn")}
              className="w-full rounded-[8px] border border-[#ff9f43]/20 bg-[#ff9f43]/10 p-3 text-[14px] font-bold text-[#ff9f43] disabled:opacity-50"
              dir="auto"
            >
              ارسال اخطار رسمی
            </button>
            {isSuspended ? (
              <button
                disabled={busy}
                onClick={() => act("unsuspend")}
                className="w-full rounded-[8px] border border-border p-3 text-[14px] text-text disabled:opacity-50"
                dir="auto"
              >
                رفع تعلیق
              </button>
            ) : (
              <button
                disabled={busy || user.banned}
                onClick={() => act("suspend", { days: 3 })}
                className="w-full rounded-[8px] border border-danger/20 bg-danger/[0.12] p-3 text-[14px] font-bold text-danger disabled:opacity-30"
                dir="auto"
              >
                تعلیق موقت حساب (۳ روز)
              </button>
            )}
            {user.banned ? (
              <button
                disabled={busy}
                onClick={() => act("unban")}
                className="w-full rounded-[8px] border border-border p-3 text-[14px] text-text disabled:opacity-50"
                dir="auto"
              >
                رفع مسدودیت حساب
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => act("ban")}
                className="w-full rounded-[8px] bg-danger p-3 text-[14px] font-bold text-white disabled:opacity-50"
                dir="auto"
              >
                مسدودسازی دائم (Ban)
              </button>
            )}
            <div className="h-px w-full bg-border" />
            <div className="flex w-full items-center justify-between">
              <button
                disabled={busy}
                onClick={() => act(user.rankVerification === "VERIFIED" ? "unverify" : "verify")}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  user.rankVerification === "VERIFIED" ? "bg-primary" : "border border-border bg-surface-alt"
                }`}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white transition-[right] duration-200"
                  style={{ right: user.rankVerification === "VERIFIED" ? 18 : 2 }}
                />
              </button>
              <p className="text-[13px] text-text" dir="auto">
                وضعیت تایید اکانت
              </p>
            </div>
          </Card>

          <Card tone="surface" noHover className="w-full gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
              گزارش‌های ثبت شده ({user.reports.length})
            </p>
            {user.reports.length === 0 ? (
              <p className="w-full text-center text-[12px] text-text-dim" dir="auto">
                گزارشی ثبت نشده.
              </p>
            ) : (
              user.reports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex w-full flex-col gap-1.5 rounded-[8px] bg-surface-alt p-3">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-[11px] text-success" dir="auto">
                      {r.status === "REVIEWED" ? "بررسی شده" : r.status === "DISMISSED" ? "رد شده" : "در انتظار"}
                    </p>
                    <p className="text-[12px] font-bold text-text" dir="auto">
                      {r.reporterName}
                    </p>
                  </div>
                  <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
                    {r.reason}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="flex w-full flex-1 flex-col gap-6">
          <Card tone="surface" noHover className="w-full p-8">
            <div className="flex w-full items-center justify-end gap-6">
              <div className="flex flex-1 flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  {user.rankVerification === "VERIFIED" && (
                    <span className="rounded-[4px] bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success" dir="auto">
                      استیم تایید شده
                    </span>
                  )}
                  <p className="text-[24px] font-black text-text" dir="auto">
                    {user.displayName}
                  </p>
                </div>
                <p className="text-[14px] text-text-dim" dir="auto">
                  عضویت از: {new Date(user.createdAt).toLocaleDateString("fa-IR")} • آخرین فعالیت:{" "}
                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString("fa-IR") : "نامشخص"}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  {user.languages && (
                    <span className="rounded-[4px] border border-border px-3 py-1 text-[12px] text-text">زبان: {user.languages}</span>
                  )}
                  {user.country && <span className="rounded-[4px] border border-border px-3 py-1 text-[12px] text-text">{user.country}</span>}
                  {user.mainPosition && (
                    <span className="rounded-[4px] bg-primary/15 px-3 py-1 text-[12px] font-bold text-accent" dir="auto">
                      {POSITION_LABEL[user.mainPosition as PositionValue]}
                    </span>
                  )}
                  <span className="rounded-[4px] bg-accent/[0.12] px-3 py-1 text-[12px] font-bold text-accent" dir="auto">
                    {RANK_LABEL[user.rank]} {user.rankTier ?? ""}
                  </span>
                </div>
              </div>
              <HeroAvatar name={user.displayName} size={80} round />
            </div>
          </Card>

          <div className="flex w-full items-center gap-8 rounded-[8px] border border-border bg-surface-alt px-6">
            {([
              ["history", "تاریخچه"],
              ["sessions", "جلسات"],
              ["reports", "گزارش‌ها"],
              ["posts", "پست‌ها"],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`border-b-2 py-3 text-[14px] ${
                  tab === key ? "border-accent font-bold text-accent" : "border-transparent text-text-dim"
                }`}
                dir="auto"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3">
            {tab === "posts" &&
              (user.posts.length === 0 ? (
                <EmptyRow text="پستی ثبت نکرده." />
              ) : (
                user.posts.map((p) => <RowCard key={p.id} tag={p.status} title={p.description.slice(0, 60)} date={p.createdAt} />)
              ))}
            {tab === "sessions" &&
              (user.posts.filter((p) => p.gameMode).length === 0 ? (
                <EmptyRow text="جلسه‌ای ثبت نشده." />
              ) : (
                user.posts.map((p) => <RowCard key={p.id} tag={p.gameMode} title={p.description.slice(0, 60)} date={p.createdAt} />)
              ))}
            {tab === "reports" &&
              (user.reports.length === 0 ? (
                <EmptyRow text="گزارشی برای این کاربر ثبت نشده." />
              ) : (
                user.reports.map((r) => <RowCard key={r.id} tag={r.severity} title={r.reason.slice(0, 60)} date={r.createdAt} />)
              ))}
            {tab === "history" &&
              (user.auditLogs.length === 0 ? (
                <EmptyRow text="اقدام نظارتی‌ای ثبت نشده." />
              ) : (
                user.auditLogs.map((a) => (
                  <RowCard key={a.id} tag={a.actorName} title={ACTION_LABEL[a.action] ?? a.action} date={a.createdAt} />
                ))
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RowCard({ tag, title, date }: { tag: string; title: string; date: string }) {
  return (
    <Card tone="surface" noHover className="w-full flex-row items-center justify-between gap-4 p-5">
      <div className="flex flex-col items-end gap-1">
        <p className="text-[15px] font-bold text-text" dir="auto">
          {title}
        </p>
        <p className="text-[12px] text-text-dim" dir="auto">
          ثبت شده در: {new Date(date).toLocaleDateString("fa-IR")}
        </p>
      </div>
      <span className="rounded-[4px] bg-surface-alt px-2 py-1 text-[11px] text-text-dim" dir="auto">
        {tag}
      </span>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card tone="surface" noHover className="w-full items-center p-8 text-center">
      <p className="text-[13px] text-text-dim" dir="auto">
        {text}
      </p>
    </Card>
  );
}
