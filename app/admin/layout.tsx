import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, type AdminResource } from "@/app/lib/permissions";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = {
  title: "پیشخوان مدیریت | دوتامیت",
};

const ALL_RESOURCES: AdminResource[] = [
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
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) redirect("/login");

  const admin = await getAdminSession(session.id);

  if (!admin) redirect("/dashboard");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/dashboard");

  const isFullAccess = ALL_RESOURCES.every((r) => admin.permissions[r] === "EDIT");

  return (
    <AdminShell displayName={user.displayName} roleName={admin.roleName} isFullAccess={isFullAccess} permissions={admin.permissions}>
      {children}
    </AdminShell>
  );
}
