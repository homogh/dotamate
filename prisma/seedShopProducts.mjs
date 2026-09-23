import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// US-region Steam wallet codes. Existing products (matched by type + price) are
// never overwritten — re-running only fills fields that are still empty, so
// edits made in the admin panel are kept.
const GIFT_CARDS = [
  { usd: 5, fa: "۵" },
  { usd: 10, fa: "۱۰" },
  { usd: 20, fa: "۲۰" },
  { usd: 25, fa: "۲۵" },
  { usd: 50, fa: "۵۰" },
  { usd: 100, fa: "۱۰۰" },
];

// Same rules as app/lib/blogSlug.ts → slugify().
function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function content(fa) {
  const title = `گیفت کارت استیم ${fa} دلاری`;
  return {
    title,
    slug: slugify(title),
    shortDescription: `کد ${fa} دلاری شارژ کیف پول استیم (ریجن آمریکا) با تحویل آنی؛ برای خرید بازی، آیتم‌های دوتا ۲ و بتل پس.`,
    description: [
      `گیفت کارت ${fa} دلاری استیم یک کد دیجیتال شارژ کیف پول استیم (Steam Wallet) است. بعد از وارد کردن کد در حساب استیم، ${fa} دلار به کیف پول شما اضافه می‌شود و می‌توانید با آن بازی بخرید، از مارکت استیم آیتم دوتا ۲ تهیه کنید یا بتل پس و آرکانا بخرید.`,
      "## چرا از دوتامیت بخرید؟",
      "- تحویل آنی کد بعد از پرداخت (وقتی کد آماده باشد)\n- قیمت شفاف تومانی و پرداخت با درگاه بانکی یا میت کیف\n- بازگشت کامل مبلغ به میت کیف اگر سفارش به هر دلیلی تحویل نشود",
      "## نکته درباره ریجن",
      "این کد مربوط به ریجن آمریکا (USD) است. اگر ارز کیف پول استیم شما دلار نباشد، مبلغ هنگام فعال‌سازی به ارز کیف پول شما تبدیل می‌شود.",
    ].join("\n\n"),
    features: ["کد دیجیتال، بدون نیاز به ارسال فیزیکی", "ریجن آمریکا (USD)", "قابل استفاده برای بازی، مارکت استیم و آیتم‌های دوتا ۲", "مبلغ مستقیم به کیف پول استیم اضافه می‌شود"].join("\n"),
    imageAlt: `گیفت کارت ${fa} دلاری استیم`,
    metaTitle: `خرید گیفت کارت ${fa} دلاری استیم | تحویل آنی | دوتامیت`,
  };
}

for (const [index, card] of GIFT_CARDS.entries()) {
  const priceUsdCents = card.usd * 100;
  const seed = content(card.fa);
  const existing = await prisma.shopProduct.findFirst({ where: { type: "GIFT_CARD", priceUsdCents } });

  if (!existing) {
    const product = await prisma.shopProduct.create({ data: { type: "GIFT_CARD", priceUsdCents, sortOrder: index + 1, ...seed } });
    console.log(`Seeded gift card: ${product.title} (id ${product.id})`);
    continue;
  }

  // Fill only what's empty. The very first seed wrote a one-line description; upgrade that too.
  const fill = {};
  for (const key of ["slug", "shortDescription", "features", "imageAlt", "metaTitle"]) {
    if (!existing[key]) fill[key] = seed[key];
  }
  if (!existing.description || existing.description.startsWith("کد شارژ کیف پول استیم به ارزش")) fill.description = seed.description;

  if (Object.keys(fill).length === 0) {
    console.log(`Skipped (complete): ${existing.title}`);
    continue;
  }
  await prisma.shopProduct.update({ where: { id: existing.id }, data: fill });
  console.log(`Filled ${Object.keys(fill).join(", ")}: ${existing.title}`);
}

await prisma.$disconnect();
