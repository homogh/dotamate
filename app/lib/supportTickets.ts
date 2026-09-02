export type TicketStatus = "در انتظار بررسی" | "در حال بررسی" | "پاسخ داده شده" | "بسته شده";

export interface SupportTicket {
  id: string;
  date: string;
  status: TicketStatus;
  category: string;
  subject: string;
}

export const TICKET_PRIORITIES = ["کم", "متوسط", "زیاد"];

export const TICKET_CATEGORIES = [
  "مشکل فنی پلتفرم",
  "مشکل حساب کاربری",
  "گزارش باگ",
  "سوال عمومی",
  "پیشنهاد و انتقاد",
];

export const STATUS_STYLES: Record<TicketStatus, { bg: string; border: string; text: string }> = {
  "در انتظار بررسی": {
    bg: "bg-[rgba(245,158,11,0.13)]",
    border: "border-[#f59e0b]",
    text: "text-[#f59e0b]",
  },
  "در حال بررسی": {
    bg: "bg-[rgba(59,130,246,0.13)]",
    border: "border-[#3b82f6]",
    text: "text-[#3b82f6]",
  },
  "پاسخ داده شده": {
    bg: "bg-[rgba(34,197,94,0.14)]",
    border: "border-[#22c55e]",
    text: "text-[#22c55e]",
  },
  "بسته شده": {
    bg: "bg-[#374151]",
    border: "border-border",
    text: "text-[rgba(255,255,255,0.5)]",
  },
};

export const RECENT_TICKETS: SupportTicket[] = [
  {
    id: "۲۹۴۲",
    date: "۱۴۰۵/۱۰/۱۲ - ۱۴:۳۰",
    status: "در انتظار بررسی",
    category: "مشکل حساب کاربری",
    subject: "عدم دریافت رنک و مدال از اکانت متصل استیم",
  },
  {
    id: "۲۸۷۱",
    date: "۱۴۰۵/۱۰/۱۱ - ۰۹:۱۵",
    status: "در حال بررسی",
    category: "گزارش باگ",
    subject: "خطا در اتصال به سرور دیسکورد در لابی",
  },
  {
    id: "۲۷۱۶",
    date: "۱۴۰۵/۱۰/۰۸ - ۲۱:۴۰",
    status: "پاسخ داده شده",
    category: "سوال عمومی",
    subject: "نحوه ارتقای مدال از سطح لجند به دیواین در لابی اختصاصی",
  },
  {
    id: "۲۵۱۸",
    date: "۱۴۰۵/۰۹/۲۴ - ۱۱:۰۲",
    status: "بسته شده",
    category: "مشکل فنی",
    subject: "عدم لود شدن چت روم متنی در مرورگر فایرفاکس نسخه قدیمی",
  },
];
