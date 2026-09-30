import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off dev cleanup: wipes orders/trades and their dependents (same as
// clearTestOrders.mjs), then also removes user-market listings and the
// test Dota items added to the shop (gift cards are kept). Run with:
//   node prisma/clearTestData.mjs
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
    const shopOrders = await tx.shopOrder.deleteMany({});
    const marketOrders = await tx.marketOrder.deleteMany({});
    const listings = await tx.marketListing.deleteMany({});
    const items = await tx.shopProduct.deleteMany({ where: { type: "ITEM" } });

    return { attachments, payments, walletTxns, giftCodes, shopOrders, marketOrders, listings, items };
  });

  console.log("پاک شد:");
  console.log(`- سفارش فروشگاه: ${result.shopOrders.count}`);
  console.log(`- سفارش بازار (ترید): ${result.marketOrders.count}`);
  console.log(`- پرداخت: ${result.payments.count}`);
  console.log(`- ردیف میت‌کیف: ${result.walletTxns.count}`);
  console.log(`- پیوست تخلف/مدرک بازار: ${result.attachments.count}`);
  console.log(`- کد گیفت آزاد شده: ${result.giftCodes.count}`);
  console.log(`- آگهی بازار کاربران: ${result.listings.count}`);
  console.log(`- آیتم دوتا (محصول فروشگاه، بدون گیفت کارت): ${result.items.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
