// One-off: grandfather in users created before the mandatory Steam/match-data
// onboarding gate existed, so they aren't suddenly locked out of /dashboard.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const result = await prisma.user.updateMany({
  where: { profileCompletedAt: null },
  data: { profileCompletedAt: new Date(), matchDataVerified: true },
});

console.log(`Grandfathered ${result.count} existing user(s).`);
await prisma.$disconnect();
