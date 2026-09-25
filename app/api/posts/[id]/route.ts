import { NextRequest, NextResponse } from "next/server";
import type { GameMode, Position, Prisma, Rank, Region, SessionType } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";
import { POSITION_VALUES, REGION_VALUES, parseEnumList, postNeededPositions } from "@/app/lib/postSlots";

const RANKS = ["UNRANKED", "HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"];
const GAME_MODES = ["RANKED_ALL_PICK", "ALL_PICK", "TURBO", "CAPTAINS_MODE"];

async function requireOwnedPost(request: NextRequest, id: string) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return { error: NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 }) };

  const post = await prisma.post.findUnique({ where: { id: Number(id) } });
  if (!post) return { error: NextResponse.json<ApiResponse>({ status: "error", message: "پست پیدا نشد.", data: null }, { status: 404 }) };
  if (post.authorId !== session.id) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "این پست مال تو نیست.", data: null }, { status: 403 }) };
  }

  return { post, session };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireOwnedPost(request, id);
  if ("error" in guard) return guard.error;

  const { post } = guard;
  const body = await request.json().catch(() => null);
  const data: Prisma.PostUpdateInput = {};
  const fail = (message: string) =>
    NextResponse.json<ApiResponse>({ status: "error", message, data: null }, { status: 400 });

  if (body?.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length < 10) return fail("توضیحات پست باید حداقل ۱۰ کاراکتر باشه.");
    data.description = description;
  }
  if (typeof body?.hasVoice === "boolean") data.hasVoice = body.hasVoice;
  if (typeof body?.voiceLink === "string") data.voiceLink = body.voiceLink.trim().slice(0, 300) || null;
  if (body?.status === "COMPLETED" || body?.status === "CANCELLED") data.status = body.status;

  // Lobby setup fields (everything the create wizard sets) — only while the
  // lobby is still open.
  const editsSetup = ["position", "rank", "rankTier", "gameMode", "regions", "neededPositions", "sessionType", "startAt", "partySize"].some(
    (key) => body?.[key] !== undefined,
  );

  if (editsSetup) {
    if (post.status !== "ACTIVE" && post.status !== "FULL") return fail("فقط پست فعال قابل ویرایشه.");

    const position = body?.position !== undefined ? String(body.position) : post.position;
    if (!(POSITION_VALUES as readonly string[]).includes(position)) return fail("پوزیشن نامعتبره.");
    data.position = position as Position;

    const rank = body?.rank !== undefined ? String(body.rank) : post.rank;
    if (!RANKS.includes(rank)) return fail("رنک نامعتبره.");
    data.rank = rank as Rank;

    const rankTier = body?.rankTier !== undefined ? body.rankTier : post.rankTier;
    data.rankTier = Number.isInteger(rankTier) && rankTier >= 1 && rankTier <= 5 && rank !== "IMMORTAL" ? rankTier : null;

    if (body?.gameMode !== undefined) {
      if (!GAME_MODES.includes(String(body.gameMode))) return fail("حالت بازی نامعتبره.");
      data.gameMode = body.gameMode as GameMode;
    }

    if (body?.regions !== undefined) {
      const regions = parseEnumList(body.regions, REGION_VALUES);
      if (!regions.length) return fail("حداقل یک سرور انتخاب کن.");
      data.region = regions[0] as Region;
      data.regions = regions;
    }

    if (body?.sessionType !== undefined || body?.startAt !== undefined) {
      const sessionType = (body?.sessionType ?? post.sessionType) === "SCHEDULED" ? "SCHEDULED" : "NOW";
      const startAt = body?.startAt ? new Date(body.startAt) : sessionType === "SCHEDULED" ? post.startAt : null;
      if (sessionType === "SCHEDULED" && (!startAt || Number.isNaN(startAt.getTime()))) return fail("زمان جلسه رو مشخص کن.");
      data.sessionType = sessionType as SessionType;
      data.startAt = sessionType === "SCHEDULED" ? startAt : null;
    }

    const neededPositions = (
      body?.neededPositions !== undefined
        ? parseEnumList(body.neededPositions, POSITION_VALUES)
        : postNeededPositions(post)
    ).filter((p) => p !== position);
    data.neededPositions = neededPositions;

    const partySize = neededPositions.length
      ? neededPositions.length + 1
      : Math.min(5, Math.max(2, Number(body?.partySize ?? post.partySize) || 5));

    const acceptedCount = await prisma.postMember.count({ where: { postId: post.id, status: "ACCEPTED" } });
    if (partySize < acceptedCount + 1) {
      return fail(`الان ${acceptedCount + 1} نفر توی پارتی هستن؛ ظرفیت نمی‌تونه کمتر از این باشه.`);
    }
    data.partySize = partySize;

    if (!data.status) data.status = acceptedCount + 1 >= partySize ? "FULL" : "ACTIVE";
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data,
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "پست به‌روزرسانی شد.", data: { id: updated.id } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireOwnedPost(request, id);
  if ("error" in guard) return guard.error;

  await prisma.post.delete({ where: { id: guard.post.id } });

  return NextResponse.json<ApiResponse>({ status: "success", message: "پست حذف شد.", data: null });
}
