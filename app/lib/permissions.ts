import prisma from "@/app/lib/prisma";
import { accountBlockMessage } from "@/app/lib/accountStatus";

export type PermissionLevel = "NONE" | "VIEW" | "EDIT";

export type AdminResource =
  | "USERS"
  | "POSTS"
  | "REPORTS"
  | "SESSIONS"
  | "REFERENCE_DATA"
  | "ANNOUNCEMENTS"
  | "AUDIT_LOG"
  | "BLOG"
  | "ROLES"
  | "TICKETS"
  | "TESTIMONIALS";

export const ADMIN_RESOURCES: AdminResource[] = [
  "USERS",
  "POSTS",
  "REPORTS",
  "SESSIONS",
  "REFERENCE_DATA",
  "ANNOUNCEMENTS",
  "AUDIT_LOG",
  "BLOG",
  "ROLES",
  "TICKETS",
  "TESTIMONIALS",
];

export interface AdminSession {
  userId: number;
  roleId: number;
  roleName: string;
  /** The seeded, non-editable «مدیر کل» role — owner-only switches (e.g. the shop) check this. */
  isSuperAdmin: boolean;
  permissions: Record<AdminResource, PermissionLevel>;
}

const LEVEL_RANK: Record<PermissionLevel, number> = { NONE: 0, VIEW: 1, EDIT: 2 };

/** Loads the acting admin's role + permission map, or null if they have no role at all. */
export async function getAdminSession(userId: number): Promise<AdminSession | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, banReason: true, suspendedUntil: true, role: { include: { permissions: true } } },
  });

  // A banned or suspended admin loses panel access along with the rest of the site.
  if (!user?.role || accountBlockMessage(user)) return null;

  const permissions = Object.fromEntries(
    user.role.permissions.map((p) => [p.resource, p.level]),
  ) as Record<AdminResource, PermissionLevel>;

  // The seeded super-admin role is non-editable, so resources added after seeding must still be granted.
  if (!user.role.editable) {
    for (const resource of ADMIN_RESOURCES) permissions[resource] = "EDIT";
  }

  return { userId, roleId: user.role.id, roleName: user.role.name, isSuperAdmin: !user.role.editable, permissions };
}

export function hasAccess(admin: AdminSession, resource: AdminResource, minLevel: PermissionLevel = "VIEW") {
  const level = admin.permissions[resource] ?? "NONE";
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}
