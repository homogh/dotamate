import { redirect } from "next/navigation";

import { isSuperAdminViewer } from "@/app/lib/superAdmin";

/** Every /admin/shop page is owner-only; the API routes enforce the same check. */
export default async function AdminShopLayout({ children }: LayoutProps<"/admin/shop">) {
  if (!(await isSuperAdminViewer())) redirect("/admin");
  return children;
}
