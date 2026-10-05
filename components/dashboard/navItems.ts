import {
  LayoutGrid,
  Swords,
  Search,
  ClipboardList,
  CalendarClock,
  MessagesSquare,
  MessageSquare,
  Bell,
  Users,
  Heart,
  Store,
  ShoppingBag,
  Wallet,
  UserCog,
  User,
  Settings,
} from "lucide-react";

import { findActiveNav, type GroupedNavGroup, type GroupedNavItem } from "@/app/lib/navGroups";

export interface DashboardNavItem extends GroupedNavItem {
  /** Shown only while the shop is switched on (orders, wallet). */
  shop?: boolean;
}

export type DashboardNavGroup = GroupedNavGroup<DashboardNavItem>;

export const DASHBOARD_HOME_ITEM: DashboardNavItem = { label: "داشبورد", href: "/dashboard", icon: LayoutGrid };

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: "lobbies",
    label: "لابی‌ها",
    icon: Swords,
    tone: "#8e7bff",
    items: [
      { label: "مرور پست‌ها", href: "/dashboard/browse", icon: Search },
      { label: "پست‌های من", href: "/dashboard/my-posts", icon: ClipboardList },
      { label: "جلسات هماهنگ‌شده", href: "/dashboard/sessions", icon: CalendarClock },
    ],
  },
  {
    id: "social",
    label: "دوستان و پیام‌ها",
    icon: MessagesSquare,
    tone: "#38bdf8",
    items: [
      { label: "پیام‌ها", href: "/dashboard/messages", icon: MessageSquare },
      { label: "اعلان‌ها", href: "/dashboard/notifications", icon: Bell },
      { label: "دوستان", href: "/dashboard/friends", icon: Users },
      { label: "علاقه‌مندی‌ها", href: "/dashboard/favorites", icon: Heart },
    ],
  },
  {
    id: "shop",
    label: "فروشگاه",
    icon: Store,
    tone: "#22c55e",
    items: [
      { label: "سفارش‌های من", href: "/dashboard/orders", icon: ShoppingBag, shop: true },
      { label: "میت کیف", href: "/dashboard/wallet", icon: Wallet, shop: true },
    ],
  },
  {
    id: "account",
    label: "حساب کاربری",
    icon: UserCog,
    tone: "#94a3b8",
    items: [
      // Exact: /dashboard/profile/[id] is someone else's profile, not yours.
      { label: "پروفایل", href: "/dashboard/profile", icon: User, exact: true },
      { label: "تنظیمات", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

/** Drops shop entries while the shop is switched off and attaches unread badges by href. */
export function filterDashboardNavGroups(shopOpen: boolean, badges: Record<string, number> = {}) {
  return DASHBOARD_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => shopOpen || !item.shop)
      .map((item) => ({ ...item, badge: badges[item.href] })),
  })).filter((group) => group.items.length > 0);
}

export function findActiveDashboardNav(pathname: string) {
  return findActiveNav(pathname, DASHBOARD_HOME_ITEM, DASHBOARD_NAV_GROUPS);
}
