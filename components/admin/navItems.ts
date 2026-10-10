import {
  LayoutGrid,
  Users,
  MessageSquare,
  CalendarClock,
  LifeBuoy,
  AlertTriangle,
  Ticket,
  MessageSquareQuote,
  Newspaper,
  FileText,
  Database,
  Store,
  Settings2,
  ShoppingBag,
  Package,
  KeyRound,
  Cog,
  Megaphone,
  Shield,
  Terminal,
  Mail,
} from "lucide-react";

import type { AdminResource } from "@/app/lib/permissions";
import { findActiveNav, type GroupedNavGroup, type GroupedNavItem } from "@/app/lib/navGroups";

export interface AdminNavItem extends GroupedNavItem {
  resource: AdminResource | null;
  /** Shown only to the «مدیر کل» role, regardless of resource permissions. */
  superAdminOnly?: boolean;
}

export type AdminNavGroup = GroupedNavGroup<AdminNavItem>;

export const ADMIN_OVERVIEW_ITEM: AdminNavItem = { label: "نمای کلی", href: "/admin", icon: LayoutGrid, resource: null };

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "community",
    label: "کاربران و لابی‌ها",
    icon: Users,
    tone: "#8e7bff",
    items: [
      { label: "کاربران", href: "/admin/users", icon: Users, resource: "USERS" },
      { label: "ایمیل‌های یادآوری", href: "/admin/emails", icon: Mail, resource: "USERS" },
      { label: "پست‌ها", href: "/admin/posts", icon: MessageSquare, resource: "POSTS" },
      { label: "جلسات", href: "/admin/sessions", icon: CalendarClock, resource: "SESSIONS" },
    ],
  },
  {
    id: "support",
    label: "پشتیبانی و نظارت",
    icon: LifeBuoy,
    tone: "#f59e0b",
    items: [
      { label: "گزارش‌ها", href: "/admin/reports", icon: AlertTriangle, resource: "REPORTS" },
      { label: "تیکت‌های پشتیبانی", href: "/admin/tickets", icon: Ticket, resource: "TICKETS" },
      { label: "نظرات کاربران", href: "/admin/testimonials", icon: MessageSquareQuote, resource: "TESTIMONIALS" },
    ],
  },
  {
    id: "content",
    label: "محتوا و داده‌ها",
    icon: Newspaper,
    tone: "#38bdf8",
    items: [
      { label: "وبلاگ", href: "/admin/blog", icon: FileText, resource: "BLOG" },
      { label: "داده‌های مرجع", href: "/admin/reference", icon: Database, resource: "REFERENCE_DATA" },
    ],
  },
  {
    id: "shop",
    label: "فروشگاه",
    icon: Store,
    tone: "#22c55e",
    items: [
      { label: "تنظیمات فروشگاه", href: "/admin/shop", icon: Settings2, resource: null, superAdminOnly: true },
      { label: "سفارش‌ها", href: "/admin/shop/orders", icon: ShoppingBag, resource: null, superAdminOnly: true },
      { label: "گیفت کارت‌ها", href: "/admin/shop/products", icon: Package, resource: null, superAdminOnly: true },
      { label: "بانک گیفت کارت", href: "/admin/shop/gift-codes", icon: KeyRound, resource: null, superAdminOnly: true },
    ],
  },
  {
    id: "system",
    label: "سیستم",
    icon: Cog,
    tone: "#94a3b8",
    items: [
      { label: "تنظیمات و اعلامیه‌ها", href: "/admin/announcements", icon: Megaphone, resource: "ANNOUNCEMENTS" },
      { label: "نقش‌ها و دسترسی‌ها", href: "/admin/roles", icon: Shield, resource: "ROLES" },
      { label: "لاگ عملیات", href: "/admin/audit-log", icon: Terminal, resource: "AUDIT_LOG" },
    ],
  },
];

function canSee(item: AdminNavItem, permissions: Record<AdminResource, string>, isSuperAdmin: boolean) {
  if (item.superAdminOnly) return isSuperAdmin;
  return item.resource === null || permissions[item.resource] === "VIEW" || permissions[item.resource] === "EDIT";
}

/** Groups trimmed to what this admin may open; groups left empty are dropped. */
export function filterAdminNavGroups(permissions: Record<AdminResource, string>, isSuperAdmin: boolean) {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item, permissions, isSuperAdmin)),
  })).filter((group) => group.items.length > 0);
}

export function findActiveAdminNav(pathname: string, groups: AdminNavGroup[] = ADMIN_NAV_GROUPS) {
  return findActiveNav(pathname, ADMIN_OVERVIEW_ITEM, groups);
}
