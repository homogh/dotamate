import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/** «میت کیف» balance, derived from the append-only ledger: everything that has cleared is spendable on-site. */
export async function getWalletBalance(userId: number, db: Db = prisma) {
  const cleared = await db.walletTransaction.aggregate({ where: { userId, availableAt: { lte: new Date() } }, _sum: { amountToman: true } });
  return { total: cleared._sum.amountToman ?? 0 };
}

/**
 * Row-locks the user so two concurrent wallet payments can't both pass the
 * balance check. Must be called inside an interactive transaction, before
 * reading the balance.
 */
export async function lockWallet(tx: Prisma.TransactionClient, userId: number) {
  await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
}
