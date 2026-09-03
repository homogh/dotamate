export const TICKET_PRIORITY_OPTIONS = [
  { value: "LOW", label: "کم" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "زیاد" },
  { value: "URGENT", label: "اضطراری" },
] as const;

export const TICKET_CATEGORY_OPTIONS = [
  { value: "TECHNICAL", label: "مشکل فنی پلتفرم" },
  { value: "ACCOUNT", label: "مشکل حساب کاربری" },
  { value: "BUG_REPORT", label: "گزارش باگ" },
  { value: "GENERAL", label: "سوال عمومی" },
  { value: "SUGGESTION", label: "پیشنهاد و انتقاد" },
] as const;

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "در انتظار بررسی",
  IN_REVIEW: "در حال بررسی",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};

export const TICKET_STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-[rgba(245,158,11,0.13)] border-[#f59e0b] text-[#f59e0b]",
  IN_REVIEW: "bg-[rgba(59,130,246,0.13)] border-[#3b82f6] text-[#3b82f6]",
  ANSWERED: "bg-[rgba(34,197,94,0.14)] border-[#22c55e] text-[#22c55e]",
  CLOSED: "bg-[#374151] border-border text-[rgba(255,255,255,0.5)]",
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = Object.fromEntries(
  TICKET_PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
);
export const TICKET_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  TICKET_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);
