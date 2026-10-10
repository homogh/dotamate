import { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { sendEmail } from "@/app/lib/mailer";
import { getPlatformSettings } from "@/app/lib/platformSettings";
import { signupReminderEmail, type OnboardingStage } from "@/app/lib/emailTemplates";
import { unsubscribeActionUrl, unsubscribePageUrl } from "@/app/lib/emailUnsubscribe";
import { emailClickUrl, emailOpenPixelUrl } from "@/app/lib/emailTracking";

const DAY_MS = 24 * 60 * 60_000;

// Day 1 / 3 / 7 after signup. Each step also waits for the previous one, so a
// user who signed up weeks ago gets the sequence spaced out (now, +2d, +4d)
// instead of all three in the same sweep.
export const SIGNUP_REMINDER_STEPS = [
  { step: 1, key: "signup-reminder-1", afterSignupDays: 1, afterPreviousDays: 0 },
  { step: 2, key: "signup-reminder-2", afterSignupDays: 3, afterPreviousDays: 2 },
  { step: 3, key: "signup-reminder-3", afterSignupDays: 7, afterPreviousDays: 4 },
] as const;

export const SIGNUP_REMINDER_KEYS = SIGNUP_REMINDER_STEPS.map((s) => s.key);

const MAX_SENDS_PER_SWEEP = 100;
// Resend's default rate limit is 2 requests/second.
const SEND_GAP_MS = 600;
// Only mail during waking hours in Iran; the hourly sweep picks the rest up in the morning.
const SEND_HOURS_TEHRAN = { from: 9, to: 22 };
// Below these the numbers would read as "empty site" rather than social proof.
const MIN_PLAYERS_TO_SHOW = 50;
const MIN_LOBBIES_TO_SHOW = 10;

function tehranHour(date: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", hour: "numeric", hourCycle: "h23" }).format(date));
}

// Mirrors the onboarding redirect in app/dashboard/layout.tsx.
function onboardingStage(user: { steamId: string | null; matchDataVerified: boolean; matchGateOverride: boolean }): OnboardingStage {
  return !user.steamId || (!user.matchDataVerified && !user.matchGateOverride) ? "steam" : "profile";
}

async function socialProofStats() {
  const [players, lobbiesThisWeek] = await Promise.all([
    prisma.user.count({ where: { profileCompletedAt: { not: null }, banned: false } }),
    prisma.post.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) } } }),
  ]);
  return {
    players: players >= MIN_PLAYERS_TO_SHOW ? players : undefined,
    lobbiesThisWeek: lobbiesThisWeek >= MIN_LOBBIES_TO_SHOW ? lobbiesThisWeek : undefined,
  };
}

// Sends the next due onboarding reminder to users who signed up with an email
// but never finished onboarding. Safe to run concurrently: an EmailLog row is
// claimed (unique userId+templateKey) before each send.
export async function processSignupReminders() {
  if (!(await getPlatformSettings()).signupRemindersEnabled) return;

  const now = new Date();
  const hour = tehranHour(now);
  if (hour < SEND_HOURS_TEHRAN.from || hour >= SEND_HOURS_TEHRAN.to) return;

  let budget = MAX_SENDS_PER_SWEEP;
  let stats: Awaited<ReturnType<typeof socialProofStats>> | null = null;

  for (const [index, step] of SIGNUP_REMINDER_STEPS.entries()) {
    if (budget <= 0) break;
    const previous = index > 0 ? SIGNUP_REMINDER_STEPS[index - 1] : null;

    const users = await prisma.user.findMany({
      where: {
        profileCompletedAt: null,
        email: { not: null },
        notifyEmail: true,
        banned: false,
        createdAt: { lte: new Date(now.getTime() - step.afterSignupDays * DAY_MS) },
        AND: [
          { OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: now } }] },
          { emailLogs: { none: { templateKey: step.key } } },
          ...(previous
            ? [{ emailLogs: { some: { templateKey: previous.key, sentAt: { lte: new Date(now.getTime() - step.afterPreviousDays * DAY_MS) } } } }]
            : []),
        ],
      },
      select: { id: true, email: true, displayName: true, steamId: true, matchDataVerified: true, matchGateOverride: true },
      orderBy: { createdAt: "asc" },
      take: budget,
    });

    if (step.step === 2 && users.length > 0 && !stats) {
      stats = await socialProofStats();
    }

    for (const user of users) {
      if (!user.email) continue;

      let logId: number;
      try {
        ({ id: logId } = await prisma.emailLog.create({ data: { userId: user.id, templateKey: step.key }, select: { id: true } }));
      } catch (error) {
        // Another sweep (or instance) already claimed this one.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }

      const stage = onboardingStage(user);
      const email = signupReminderEmail({
        step: step.step,
        displayName: user.displayName,
        stage,
        continueUrl: emailClickUrl(logId, `/signup/${stage}?utm_source=email&utm_medium=reminder&utm_campaign=${step.key}`),
        unsubscribeUrl: unsubscribePageUrl(user.id),
        trackingPixelUrl: emailOpenPixelUrl(logId),
        stats: stats ?? undefined,
      });

      try {
        await sendEmail({
          to: user.email,
          ...email,
          headers: {
            "List-Unsubscribe": `<${unsubscribeActionUrl(user.id)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
      } catch (error) {
        // Release the claim so the next sweep retries this user.
        await prisma.emailLog.deleteMany({ where: { id: logId } });
        console.error(`[mail] ${step.key} to user ${user.id} failed`, error);
      }

      budget--;
      await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
    }
  }
}
