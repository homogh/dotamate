import type { AdminResource } from "@/app/lib/permissions";

export interface AdminNavItem {
  label: string;
  href: string;
  resource: AdminResource | null;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "نمای کلی", href: "/admin", resource: null },
  { label: "کاربران", href: "/admin/users", resource: "USERS" },
  { label: "پست‌ها", href: "/admin/posts", resource: "POSTS" },
  { label: "گزارش‌ها", href: "/admin/reports", resource: "REPORTS" },
  { label: "تیکت‌های پشتیبانی", href: "/admin/tickets", resource: "TICKETS" },
  { label: "جلسات", href: "/admin/sessions", resource: "SESSIONS" },
  { label: "وبلاگ", href: "/admin/blog", resource: "BLOG" },
  { label: "داده‌های مرجع", href: "/admin/reference", resource: "REFERENCE_DATA" },
  { label: "اعلامیه‌ها", href: "/admin/announcements", resource: "ANNOUNCEMENTS" },
  { label: "نقش‌ها و دسترسی‌ها", href: "/admin/roles", resource: "ROLES" },
  { label: "لاگ عملیات", href: "/admin/audit-log", resource: "AUDIT_LOG" },
];
