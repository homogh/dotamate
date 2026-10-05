import type { LucideIcon } from "lucide-react";

export interface GroupedNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Red counter pill (unread messages etc.); hidden at 0. */
  badge?: number;
  /** Only this exact path counts as active, not pages nested under it. */
  exact?: boolean;
}

export interface GroupedNavGroup<T extends GroupedNavItem = GroupedNavItem> {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Accent colour for the group's icon tile and active-item indicator. */
  tone: string;
  items: T[];
}

/**
 * Longest-prefix match so nested pages (/admin/shop/products/12) still light up
 * their parent entry. The root item only matches itself, otherwise it would win
 * for every unknown page under it.
 */
export function findActiveNav<T extends GroupedNavItem>(pathname: string, root: T, groups: GroupedNavGroup<T>[]) {
  if (pathname === root.href) return { item: root, group: null };

  let best: { item: T; group: GroupedNavGroup<T> } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (pathname !== item.href && (item.exact || !pathname.startsWith(`${item.href}/`))) continue;
      if (!best || item.href.length > best.item.href.length) best = { item, group };
    }
  }
  return best;
}
