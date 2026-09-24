import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isShopEnabled } from "@/app/lib/platformSettings";

/**
 * «سفارش‌های من» and «میت کیف» follow the shop switch: while the shop is off
 * they 404 for everyone. Nothing is lost — orders and balances reappear as
 * soon as the shop is switched back on.
 */
export default async function DashboardShopLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!(await isShopEnabled())) notFound();
  return children;
}
