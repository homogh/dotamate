import prisma from "@/app/lib/prisma";

class OrderNotWaiting extends Error {}

type AssignResult = "assigned" | "bank-empty" | "order-not-waiting";

/**
 * Claims one AVAILABLE code for a paid order and marks the order delivered.
 * Both halves are conditional updates in one transaction: two concurrent
 * calls can never hand out the same code, and an order that was refunded in
 * the meantime never receives one (the code claim rolls back).
 */
export async function assignGiftCode(orderId: number, productId: number): Promise<AssignResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = await prisma.giftCode.findFirst({
      where: { productId, status: "AVAILABLE" },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (!candidate) return "bank-empty";

    try {
      const claimed = await prisma.$transaction(async (tx) => {
        const { count } = await tx.giftCode.updateMany({
          where: { id: candidate.id, status: "AVAILABLE" },
          data: { status: "ASSIGNED", orderId, assignedAt: new Date() },
        });
        if (count === 0) return false; // lost the race for this code — try the next one

        const delivered = await tx.shopOrder.updateMany({
          where: { id: orderId, status: "AWAITING_CODE" },
          data: { status: "DELIVERED", deliveredAt: new Date() },
        });
        if (delivered.count === 0) throw new OrderNotWaiting();

        const order = await tx.shopOrder.findUniqueOrThrow({ where: { id: orderId }, include: { product: { select: { title: true } } } });
        await tx.notification.create({
          data: {
            userId: order.userId,
            type: "SHOP_ORDER",
            title: "کد گیفت کارت شما آماده است",
            body: `${order.product.title} — سفارش #${order.id}`,
            link: `/dashboard/orders/${order.id}`,
          },
        });
        return true;
      });

      if (claimed) return "assigned";
    } catch (error) {
      if (error instanceof OrderNotWaiting) return "order-not-waiting";
      throw error;
    }
  }
  return "bank-empty";
}

/** After new codes are stocked, fill orders that were paid while the bank was empty — oldest first. */
export async function fulfillWaitingGiftOrders(productId: number) {
  const waiting = await prisma.shopOrder.findMany({
    where: { productId, status: "AWAITING_CODE" },
    orderBy: { paidAt: "asc" },
    select: { id: true },
  });

  let fulfilled = 0;
  for (const order of waiting) {
    const result = await assignGiftCode(order.id, productId);
    if (result === "bank-empty") break;
    if (result === "assigned") fulfilled++;
  }
  return fulfilled;
}
