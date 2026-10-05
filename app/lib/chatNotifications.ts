import prisma from "@/app/lib/prisma";

/**
 * The chat pages poll every 4s while open; a viewer counts as watching for a
 * few missed polls before message notifications start reaching them again.
 */
const WATCHING_TTL_MS = 12000;

export function dmChatKey(conversationId: number) {
  return `dm:${conversationId}`;
}

export function lobbyChatKey(postId: number) {
  return `lobby:${postId}`;
}

function messageTitle(count: number, senderName: string) {
  return count > 1 ? `${count.toLocaleString("fa-IR")} پیام جدید از ${senderName}` : `پیام جدید از ${senderName}`;
}

/**
 * Called from the chat poll while the tab is visible and focused: marks the
 * user as watching this chat and clears its message notifications, since
 * everything in them is on their screen now.
 */
export async function markWatchingChat(userId: number, chatKey: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { activeChatKey: chatKey, activeChatAt: new Date() } }),
    prisma.notification.updateMany({
      where: { userId, type: "NEW_MESSAGE", read: false, groupKey: { startsWith: `${chatKey}:` } },
      data: { read: true },
    }),
  ]);
}

/** Called when the chat tab is hidden, blurred or closed. */
export async function stopWatchingChat(userId: number, chatKey: string) {
  await prisma.user.updateMany({ where: { id: userId, activeChatKey: chatKey }, data: { activeChatAt: null } });
}

/**
 * Notifies recipients of a new chat message. Anyone watching the chat gets
 * nothing; everyone else gets a single unread notification per chat + sender
 * whose counter grows ("۵ پیام جدید از …") and jumps back to the top.
 */
export async function notifyChatMessage({
  chatKey,
  recipientIds,
  senderId,
  senderName,
  text,
  link,
}: {
  chatKey: string;
  recipientIds: number[];
  senderId: number;
  senderName: string;
  text: string;
  link: string;
}) {
  if (recipientIds.length === 0) return;

  const watching = await prisma.user.findMany({
    where: { id: { in: recipientIds }, activeChatKey: chatKey, activeChatAt: { gte: new Date(Date.now() - WATCHING_TTL_MS) } },
    select: { id: true },
  });
  const watchingIds = new Set(watching.map((u) => u.id));

  const groupKey = `${chatKey}:${senderId}`;
  const body = text.slice(0, 200);

  for (const userId of recipientIds) {
    if (watchingIds.has(userId)) continue;

    // Increment in SQL and only on a still-unread row, so two quick messages
    // can't read the same count and a just-read notification isn't revived.
    const bumped = await prisma.notification.updateMany({
      where: { userId, groupKey, read: false },
      data: { count: { increment: 1 }, body, createdAt: new Date() },
    });

    if (bumped.count === 0) {
      await prisma.notification.create({
        data: { userId, type: "NEW_MESSAGE", title: messageTitle(1, senderName), body, link, groupKey },
      });
      continue;
    }

    const row = await prisma.notification.findFirst({ where: { userId, groupKey, read: false }, select: { id: true, count: true } });
    if (row) await prisma.notification.update({ where: { id: row.id }, data: { title: messageTitle(row.count, senderName) } });
  }
}
