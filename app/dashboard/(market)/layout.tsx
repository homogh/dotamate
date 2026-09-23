import { notFound } from "next/navigation";
import { connection } from "next/server";

import { canUseMarket } from "@/app/lib/shopAccess";
import { getViewerSession } from "@/app/lib/shopCatalog";

/** «آگهی‌های من»، «فروش‌های من» and market order pages exist only while the user market is on. */
export default async function DashboardMarketLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const viewer = await getViewerSession();
  if (!(await canUseMarket(viewer?.id ?? null))) notFound();
  return children;
}
