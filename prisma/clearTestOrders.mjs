import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off dev cleanup: wipes shop orders, market orders/trades and everything
// that hangs off them (payments, wallet ledger rows, attachments), and
// releases gift codes + market listings back to sellable state. Run with:
//   node prisma/clearTestOrders.mjs
// Never run this against a database with real users/money.

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const attachments = await tx.marketOrderAttachment.deleteMany({});
    const payments = await tx.payment.deleteMany({});
    const walletTxns = await tx.walletTransaction.deleteMany({});
    const giftCodes = await tx.giftCode.updateMany({
      where: { orderId: { not: null } },
      data: { orderId: null, status: "AVAILABLE", assignedAt: null },
    });
    const listings = await tx.marketListing.updateMany({
      where: { soldAt: { not: null } },
      data: { status: "ACTIVE", soldAt: null },
    });
    const shopOrders = await tx.shopOrder.deleteMany({});
    const marketOrders = await tx.marketOrder.deleteMany({});

    return { attachments, payments, walletTxns, giftCodes, listings, shopOrders, marketOrders };
  });

  console.log("پاک شد:");
  console.log(`- سفارش فروشگاه: ${result.shopOrders.count}`);
  console.log(`- سفارش بازار (ترید): ${result.marketOrders.count}`);
  console.log(`- پرداخت: ${result.payments.count}`);
  console.log(`- ردیف میت‌کیف: ${result.walletTxns.count}`);
  console.log(`- پیوست تخلف/مدرک بازار: ${result.attachments.count}`);
  console.log(`- کد گیفت آزاد شده: ${result.giftCodes.count}`);
  console.log(`- آگهی بازار برگشته به فعال: ${result.listings.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
