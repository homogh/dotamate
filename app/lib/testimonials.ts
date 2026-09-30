import { RANK_LABEL } from "@/components/dashboard/postLabels";

export const TESTIMONIAL_MIN_LENGTH = 20;
export const TESTIMONIAL_MAX_LENGTH = 500;

export const TESTIMONIAL_STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار تایید",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
};

export function testimonialRankLabel(rank: string, rankTier: number | null) {
  if (rank === "UNRANKED") return null;
  const tier = rank !== "IMMORTAL" && rankTier ? ` ${rankTier.toLocaleString("fa-IR")}` : "";
  return `${RANK_LABEL[rank] ?? rank}${tier}`;
}
