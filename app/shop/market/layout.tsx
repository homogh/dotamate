import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EyeOff } from "lucide-react";

import { isMarketEnabled } from "@/app/lib/platformSettings";
import { canUseMarket } from "@/app/lib/shopAccess";
import { getViewerSession } from "@/app/lib/shopCatalog";

/**
 * Gate for every /shop/market route. While the market switch is off it 404s
 * for everyone except the «مدیر کل», who gets a preview banner instead.
 */
export default async function MarketLayout({ children }: LayoutProps<"/shop/market">) {
  await connection();
  if (await isMarketEnabled()) return children;

  const viewer = await getViewerSession();
  if (!(await canUseMarket(viewer?.id ?? null))) notFound();

  return (
    <>
      <div className="flex w-full items-center justify-center gap-2 border-b border-primary/40 bg-primary/10 px-6 py-2.5">
        <EyeOff size={15} className="shrink-0 text-accent" />
        <p className="text-[13px] text-accent">پیش‌نمایش مدیر — بازار کاربران غیرفعال است و کاربران آن را نمی‌بینند.</p>
      </div>
      {children}
    </>
  );
}
