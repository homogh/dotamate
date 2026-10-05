import type { MetadataRoute } from "next";
import { connection } from "next/server";

import prisma from "@/app/lib/prisma";
import { isShopEnabled } from "@/app/lib/platformSettings";
import { productHref, SHOP_CATEGORIES } from "@/app/lib/shopCategories";

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/search-lobby", priority: 0.9, changeFrequency: "hourly" as const },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/meta", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/login", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/signup", priority: 0.6, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request so newly published posts and the shop switch show up without a redeploy.
  await connection();

  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  // The shop only exists publicly while it's switched on — never advertise 404s.
  const shopOn = await isShopEnabled();
  const products = shopOn
    ? await prisma.shopProduct.findMany({ where: { type: "GIFT_CARD", active: true }, select: { id: true, slug: true, updatedAt: true } })
    : [];
  const shopEntries: MetadataRoute.Sitemap = shopOn
    ? [
        { url: `${SITE_URL}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
        ...SHOP_CATEGORIES.map((c) => ({
          url: `${SITE_URL}/shop/${c.key}`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        })),
        ...products.map((p) => ({ url: `${SITE_URL}${productHref(p)}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
      ]
    : [];

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...shopEntries,
  ];
}
