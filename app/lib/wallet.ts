import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * «میت کیف» balance, derived from the append-only ledger.
 * - `total`: spendable on-site right now (everything that has cleared).
 * - `pending`: sale income still inside its hold period — visible, not yet usable.
 * - `withdrawable`: cleared sale income, capped at `total` so money already spent
 *   on-site can never be withdrawn a second time.
 */
export async function getWalletBalance(userId: number, db: Db = prisma) {
  const now = new Date();
  const [cleared, pending, withdrawable] = await Promise.all([
    db.walletTransaction.aggregate({ where: { userId, availableAt: { lte: now } }, _sum: { amountToman: true } }),
    db.walletTransaction.aggregate({ where: { userId, availableAt: { gt: now } }, _sum: { amountToman: true } }),
    db.walletTransaction.aggregate({ where: { userId, withdrawable: true, availableAt: { lte: now } }, _sum: { amountToman: true } }),
  ]);

  const total = cleared._sum.amountToman ?? 0;
  return {
    total,
    pending: pending._sum.amountToman ?? 0,
    withdrawable: Math.max(0, Math.min(withdrawable._sum.amountToman ?? 0, total)),
  };
}

/**
 * Row-locks the user so two concurrent wallet payments can't both pass the
 * balance check. Must be called inside an interactive transaction, before
 * reading the balance.
 */
export async function lockWallet(tx: Prisma.TransactionClient, userId: number) {
  await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
}
