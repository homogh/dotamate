import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { SIGNUP_REMINDER_KEYS, SIGNUP_REMINDER_STEPS } from "@/app/lib/signupReminders";
import type { ApiResponse } from "@/app/types/api";

const PAGE_SIZE = 10;
const FILTERS = ["all", "clicked", "completed", "incomplete"] as const;

const STEP_LABEL: Record<number, string> = {
  1: "یادآوری اول (روز ۱)",
  2: "یادآوری دوم (روز ۳)",
  3: "یادآوری آخر (روز ۷)",
};

interface RecipientRow {
  userId: number;
  displayName: string;
  email: string | null;
  lastStep: number;
  lastSentAt: Date;
  opened: boolean;
  clicked: boolean;
  completedAt: Date | null;
  // Reminder that was the last one sent before the user finished onboarding.
  convertedStep: number | null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "USERS", "VIEW")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filterParam = searchParams.get("filter") ?? "all";
  const filter = (FILTERS as readonly string[]).includes(filterParam) ? filterParam : "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [logs, incompleteWithEmail, notYetEmailed, unsubscribed] = await Promise.all([
    prisma.emailLog.findMany({
      where: { templateKey: { in: SIGNUP_REMINDER_KEYS } },
      orderBy: { sentAt: "asc" },
      select: {
        templateKey: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        user: { select: { id: true, displayName: true, email: true, profileCompletedAt: true } },
      },
    }),
    prisma.user.count({ where: { profileCompletedAt: null, email: { not: null }, banned: false } }),
    prisma.user.count({
      where: {
        profileCompletedAt: null,
        email: { not: null },
        banned: false,
        notifyEmail: true,
        emailLogs: { none: { templateKey: { in: SIGNUP_REMINDER_KEYS } } },
      },
    }),
    prisma.user.count({ where: { profileCompletedAt: null, email: { not: null }, notifyEmail: false } }),
  ]);

  const stepOf = new Map<string, number>(SIGNUP_REMINDER_STEPS.map((s) => [s.key, s.step]));
  const steps = SIGNUP_REMINDER_STEPS.map((s) => ({ step: s.step, label: STEP_LABEL[s.step], sent: 0, opened: 0, clicked: 0, completed: 0 }));
  const byUser = new Map<number, RecipientRow>();

  // Logs are oldest first, so each user's row ends up describing their latest reminder.
  for (const log of logs) {
    const step = stepOf.get(log.templateKey) ?? 0;
    const stat = steps[step - 1];
    stat.sent++;
    if (log.openedAt) stat.opened++;
    if (log.clickedAt) stat.clicked++;

    const completedAt = log.user.profileCompletedAt;
    const row = byUser.get(log.user.id) ?? {
      userId: log.user.id,
      displayName: log.user.displayName,
      email: log.user.email,
      lastStep: step,
      lastSentAt: log.sentAt,
      opened: false,
      clicked: false,
      completedAt,
      convertedStep: null,
    };
    if (!completedAt || log.sentAt <= completedAt) {
      row.lastStep = step;
      row.lastSentAt = log.sentAt;
      row.opened ||= Boolean(log.openedAt);
      row.clicked ||= Boolean(log.clickedAt);
      if (completedAt) row.convertedStep = step;
    }
    byUser.set(log.user.id, row);
  }

  const recipients = [...byUser.values()];
  for (const row of recipients) {
    if (row.convertedStep) steps[row.convertedStep - 1].completed++;
  }

  const completed = recipients.filter((r) => r.convertedStep !== null);
  const summary = {
    recipients: recipients.length,
    opened: recipients.filter((r) => r.opened).length,
    clicked: recipients.filter((r) => r.clicked).length,
    completed: completed.length,
    completedAfterClick: completed.filter((r) => r.clicked).length,
    incompleteWithEmail,
    notYetEmailed,
    unsubscribed,
  };

  const filtered = recipients
    .filter((r) => {
      if (filter === "clicked") return r.clicked;
      if (filter === "completed") return r.convertedStep !== null;
      if (filter === "incomplete") return r.convertedStep === null;
      return true;
    })
    .sort((a, b) => b.lastSentAt.getTime() - a.lastSentAt.getTime());

  const data = {
    enabled: process.env.SIGNUP_REMINDERS_ENABLED === "true",
    summary,
    steps,
    recipients: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page,
    pageCount: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    total: filtered.length,
    pageSize: PAGE_SIZE,
  };

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
