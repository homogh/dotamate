import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EyeOff } from "lucide-react";

import { isSuperAdminViewer } from "@/app/lib/superAdmin";
import { isShopEnabled } from "@/app/lib/platformSettings";

export const metadata: Metadata = {
  title: "فروشگاه | دوتامیت",
  description: "خرید گیفت کارت، آیتم‌های دوتا ۲ و بازار خرید و فروش آیتم بین بازیکنان.",
};

/**
 * Gate for every /shop route. While the shop is switched off in the admin
 * panel it 404s for everyone — only the «مدیر کل» can still open it, so the
 * shop can be built and previewed before it goes public.
 */
export default async function ShopLayout({ children }: LayoutProps<"/shop">) {
  // Never prerender: the on/off switch must be read on every request, not baked in at build time.
  await connection();

  if (await isShopEnabled()) return children;

  if (!(await isSuperAdminViewer())) notFound();

  return (
    <>
      <div className="flex w-full items-center justify-center gap-2 border-b border-primary/40 bg-primary/10 px-6 py-2.5" dir="auto">
        <EyeOff size={15} className="shrink-0 text-accent" />
        <p className="text-[13px] text-accent">
          پیش‌نمایش مدیر — فروشگاه غیرفعال است و کاربران عادی این صفحه را نمی‌بینند.
        </p>
      </div>
      {children}
    </>
  );
}
