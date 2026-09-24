import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isShopEnabled } from "@/app/lib/platformSettings";

export const metadata: Metadata = {
  title: "فروشگاه | دوتامیت",
  description: "خرید گیفت کارت، آیتم‌های دوتا ۲ و بازار خرید و فروش آیتم بین بازیکنان.",
};

/** Gate for every /shop route: while the shop switch is off it 404s for everyone. */
export default async function ShopLayout({ children }: LayoutProps<"/shop">) {
  // Never prerender: the on/off switch must be read on every request, not baked in at build time.
  await connection();
  if (!(await isShopEnabled())) notFound();
  return children;
}
