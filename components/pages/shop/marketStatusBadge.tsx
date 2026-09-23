import type { MarketOrderStatus } from "@prisma/client";

import { MARKET_STATUS_LABELS } from "@/app/lib/marketOrders";

const TONES: Record<MarketOrderStatus, string> = {
  PENDING_PAYMENT: "border-border text-text-dim",
  AWAITING_SELLER: "border-[#f59e0b]/60 text-[#f59e0b]",
  SELLER_SENT: "border-primary/40 text-accent",
  COMPLETED: "border-success/40 text-success",
  DISPUTED: "border-danger/40 text-danger",
  REFUNDED: "border-primary/40 text-accent",
  CANCELLED: "border-border text-text-dim",
};

export function MarketStatusBadge({ status }: { status: MarketOrderStatus }) {
  return <span className={`whitespace-nowrap rounded-[6px] border px-2.5 py-1 text-[12px] font-bold ${TONES[status]}`}>{MARKET_STATUS_LABELS[status]}</span>;
}
