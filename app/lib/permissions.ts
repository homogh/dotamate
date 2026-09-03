import prisma from "@/app/lib/prisma";

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
  | "TICKETS";

export interface AdminSession {
  userId: number;
  roleId: number;
  roleName: string;
  permissions: Record<AdminResource, PermissionLevel>;
}

const LEVEL_RANK: Record<PermissionLevel, number> = { NONE: 0, VIEW: 1, EDIT: 2 };

/** Loads the acting admin's role + permission map, or null if they have no role at all. */
export async function getAdminSession(userId: number): Promise<AdminSession | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { include: { permissions: true } } },
  });

  if (!user?.role) return null;

  const permissions = Object.fromEntries(
    user.role.permissions.map((p) => [p.resource, p.level]),
  ) as Record<AdminResource, PermissionLevel>;

  return { userId, roleId: user.role.id, roleName: user.role.name, permissions };
}

export function hasAccess(admin: AdminSession, resource: AdminResource, minLevel: PermissionLevel = "VIEW") {
  const level = admin.permissions[resource] ?? "NONE";
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}
