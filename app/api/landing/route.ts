import { NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import type { ApiResponse } from "@/app/types/api";
import { postRegions } from "@/app/lib/postSlots";

const RANK_LABEL: Record<string, string> = {
  UNRANKED: "بدون رنک", HERALD: "Herald", GUARDIAN: "Guardian", CRUSADER: "Crusader",
  ARCHON: "Archon", LEGEND: "Legend", ANCIENT: "Ancient", DIVINE: "Divine", IMMORTAL: "Immortal",
};

const POSITION_LABEL: Record<string, string> = {
  POS1: "پوزیشن ۱ (Carry)", POS2: "پوزیشن ۲ (Mid)", POS3: "پوزیشن ۳ (Offlane)",
  POS4: "پوزیشن ۴ (Soft Support)", POS5: "پوزیشن ۵ (Hard Support)",
};

const REGION_LABEL: Record<string, string> = {
  EU_WEST: "اروپا غربی", EU_EAST: "اروپا شرقی", RUSSIA: "روسیه", DUBAI: "دبی",
};

/** Public, small landing-page payload. It deliberately exposes no contact or Steam data. */
export async function GET() {
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [latestPost, activePlayers, completedSessions, acceptedJoins] = await Promise.all([
    prisma.post.findFirst({
      where: { status: "ACTIVE" },
      include: { author: { select: { displayName: true, avatarUrl: true, rankTier: true } }, members: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { banned: false, lastActiveAt: { gte: monthAgo } } }),
    prisma.post.count({ where: { status: "COMPLETED" } }),
    prisma.postMember.count({ where: { status: "ACCEPTED" } }),
  ]);

  const latestLobby = latestPost
    ? {
        id: latestPost.id,
        authorName: latestPost.author.displayName,
        authorAvatarUrl: latestPost.author.avatarUrl,
        rank: RANK_LABEL[latestPost.rank],
        position: POSITION_LABEL[latestPost.position],
        region: postRegions(latestPost).map((r) => REGION_LABEL[r]).join("، "),
        hasVoice: latestPost.hasVoice,
        description: latestPost.description,
        createdAt: latestPost.createdAt.toISOString(),
        memberCount: latestPost.members.filter((member) => member.status === "ACCEPTED").length + 1,
        partySize: latestPost.partySize,
      }
    : null;

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { latestLobby, stats: { activePlayers, completedSessions, acceptedJoins } },
  });
}
