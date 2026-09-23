import prisma from "@/app/lib/prisma";

// A user counts as online while their tab keeps polling the notification
// summary (every 15s) — see app/api/dashboard/notifications/summary.
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastActiveAt: Date | null) {
  return Boolean(lastActiveAt && Date.now() - lastActiveAt.getTime() < ONLINE_WINDOW_MS);
}

export type FriendState = "NONE" | "OUTGOING" | "INCOMING" | "FRIENDS";

export interface FriendRelation {
  state: FriendState;
  requestId: number | null;
}

export function relationFrom(
  friendship: { id: number; requesterId: number; status: string } | null | undefined,
  viewerId: number,
): FriendRelation {
  if (!friendship) return { state: "NONE", requestId: null };
  if (friendship.status === "ACCEPTED") return { state: "FRIENDS", requestId: friendship.id };
  return { state: friendship.requesterId === viewerId ? "OUTGOING" : "INCOMING", requestId: friendship.id };
}

export function findFriendship(userA: number, userB: number) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}
