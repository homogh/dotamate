import type { AdminResource } from "@/app/lib/permissions";

export interface AdminNavItem {
  label: string;
  href: string;
  resource: AdminResource | null;
  /** Shown only to the «مدیر کل» role, regardless of resource permissions. */
  superAdminOnly?: boolean;
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
  { label: "فروشگاه", href: "/admin/shop", resource: null, superAdminOnly: true },
  { label: "سفارش‌های فروشگاه", href: "/admin/shop/orders", resource: null, superAdminOnly: true },
  { label: "محصولات فروشگاه", href: "/admin/shop/products", resource: null, superAdminOnly: true },
  { label: "بانک گیفت کارت", href: "/admin/shop/gift-codes", resource: null, superAdminOnly: true },
  { label: "بازار کاربران", href: "/admin/shop/market", resource: null, superAdminOnly: true },
  { label: "درخواست‌های برداشت", href: "/admin/shop/payouts", resource: null, superAdminOnly: true },
  { label: "نقش‌ها و دسترسی‌ها", href: "/admin/roles", resource: "ROLES" },
  { label: "لاگ عملیات", href: "/admin/audit-log", resource: "AUDIT_LOG" },
  { label: "رفتن به پنل کلاینت", href: "/dashboard", resource: null },
];

export function filterAdminNavItems(permissions: Record<AdminResource, string>, isSuperAdmin: boolean) {
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    return item.resource === null || permissions[item.resource] === "VIEW" || permissions[item.resource] === "EDIT";
  });
}
