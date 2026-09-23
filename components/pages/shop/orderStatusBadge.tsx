import { ORDER_STATUS_LABELS } from "@/app/lib/shopOrders";

const STATUS_TONES: Record<string, string> = {
  PENDING_PAYMENT: "border-border text-text-dim",
  AWAITING_CODE: "border-[#f59e0b]/60 text-[#f59e0b]",
  AWAITING_DELIVERY: "border-[#f59e0b]/60 text-[#f59e0b]",
  DELIVERED: "border-success/40 text-success",
  CANCELLED: "border-border text-text-dim",
  REFUNDED: "border-primary/40 text-accent",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`whitespace-nowrap rounded-[6px] border px-2.5 py-1 text-[12px] font-bold ${STATUS_TONES[status] ?? ""}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
