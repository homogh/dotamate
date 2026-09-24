import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isMarketEnabled } from "@/app/lib/platformSettings";

/** Gate for every /shop/market route: while the market switch is off it 404s for everyone. */
export default async function MarketLayout({ children }: LayoutProps<"/shop/market">) {
  await connection();
  if (!(await isMarketEnabled())) notFound();
  return children;
}
