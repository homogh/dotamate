import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: "داشبورد | دوتامیت",
};

const RANK_LABEL: Record<string, string> = {
  UNRANKED: "بدون رنک",
  HERALD: "Herald",
  GUARDIAN: "Guardian",
  CRUSADER: "Crusader",
  ARCHON: "Archon",
  LEGEND: "Legend",
  ANCIENT: "Ancient",
  DIVINE: "Divine",
  IMMORTAL: "Immortal",
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });

  if (!user) {
    redirect("/login");
  }

  const [unreadNotifications, participants] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 50 } } } },
    }),
  ]);

  const unreadMessages = participants.reduce((sum, participant) => {
    const unread = participant.conversation.messages.filter(
      (message) =>
        message.senderId !== user.id && (!participant.lastReadAt || message.createdAt > participant.lastReadAt),
    ).length;
    return sum + unread;
  }, 0);

  const rankLabel = RANK_LABEL[user.rank] + (user.rankTier ? ` ${user.rankTier}` : "");

  return (
    <DashboardShell
      user={{ displayName: user.displayName, rankLabel }}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </DashboardShell>
  );
}
