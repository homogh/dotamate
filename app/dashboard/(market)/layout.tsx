import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isMarketEnabled } from "@/app/lib/platformSettings";

/** «آگهی‌های من»، «فروش‌های من» and market order pages exist only while the user market is on. */
export default async function DashboardMarketLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!(await isMarketEnabled())) notFound();
  return children;
}
