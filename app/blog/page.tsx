import type { Metadata } from "next";

import prisma from "@/app/lib/prisma";
import { getHeroLookup } from "@/app/lib/opendota";
import { estimateReadTime, type ContentBlock, type BlogHeroRef, type PublicBlogPostSummary } from "@/app/lib/blogPosts";
import { BlogListContent } from "@/components/pages/blog/blogListContent";

export const metadata: Metadata = {
  title: "وبلاگ | دوتامیت",
  description: "آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "وبلاگ دوتامیت",
    description: "آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲.",
    url: "/blog",
    type: "website",
  },
};

// Revalidated frequently rather than fully static, so a post published from
// the admin panel shows up here without a full redeploy.
export const revalidate = 60;

export default async function BlogListPage() {
  const [posts, heroLookup] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    }),
    getHeroLookup(),
  ]);

  const summaries: PublicBlogPostSummary[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    categories: p.categories.split(",").map((c) => c.trim()).filter(Boolean),
    tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    heroes: p.heroIds
      ? p.heroIds
          .split(",")
          .map(Number)
          .filter((id) => !Number.isNaN(id) && heroLookup[id])
          .map((id) => ({ id, name: heroLookup[id].localizedName, icon: heroLookup[id].icon }))
      : [],
    coverImageUrl: p.coverImageUrl,
    coverImageAlt: p.coverImageAlt,
    publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
    readTimeMinutes: estimateReadTime(p.body as unknown as ContentBlock[]),
  }));

  const allHeroes: BlogHeroRef[] = Object.entries(heroLookup)
    .map(([id, h]) => ({ id: Number(id), name: h.localizedName, icon: h.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "وبلاگ دوتامیت",
    description: "آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲.",
    url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/blog`,
    blogPost: summaries.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/blog/${p.slug}`,
      datePublished: p.publishedAt,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogListContent posts={summaries} allHeroes={allHeroes} />
    </>
  );
}
