import Link from "next/link";
import { redirect } from "next/navigation";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { Card } from "@/components/general/card";
import { OrderStatusBadge } from "@/components/pages/shop/orderStatusBadge";

export default async function OrdersPage() {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");

  // Abandoned gateway checkouts stay out of the list — they never took money.
  const orders = await prisma.shopOrder.findMany({
    where: { userId: viewer.id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full items-center justify-between border-b border-border pb-3">
          <Link href="/shop" className="rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white">
            خرید گیفت کارت
          </Link>
          <p className="text-[16px] font-black text-text">سفارش‌های من</p>
        </div>

        {orders.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">هنوز گیفت کارتی نخریده‌ای.</p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-4 transition-colors hover:border-white/20"
              >
                <OrderStatusBadge status={order.status} />
                <div className="flex items-center gap-5">
                  <p className="text-[13px] font-bold text-text">{order.totalToman.toLocaleString("fa-IR")} تومان</p>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {order.product.title}
                    </p>
                    <p className="text-[11px] text-text-dim">
                      #{order.id} · {order.createdAt.toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
