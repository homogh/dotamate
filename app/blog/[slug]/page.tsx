import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import prisma from "@/app/lib/prisma";
import { getHeroLookup } from "@/app/lib/opendota";
import { estimateReadTime, type ContentBlock } from "@/app/lib/blogPosts";
import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";
import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { GeneratedCover } from "@/components/general/generatedCover";
import { HeroAvatar } from "@/components/general/heroAvatar";

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { author: true },
  });
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "وبلاگ دوتامیت" };

  const title = post.metaTitle || `${post.title} | وبلاگ دوتامیت`;
  const description = post.metaDescription || post.excerpt || undefined;
  const ogImage = post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    keywords: post.tags ? post.tags.split(",").map((t) => t.trim()) : undefined,
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.displayName],
      images: ogImage,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage?.map((i) => i.url),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const body = post.body as unknown as ContentBlock[];
  const categories = post.categories.split(",").map((c) => c.trim()).filter(Boolean);
  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const heroIds = post.heroIds ? post.heroIds.split(",").map(Number).filter((n) => !Number.isNaN(n)) : [];
  const readTimeMinutes = estimateReadTime(body);

  const [otherPublished, hotPosts, heroLookup] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", id: { not: post.id } },
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", id: { not: post.id } },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    getHeroLookup(),
  ]);

  const sameCategory = otherPublished.filter((p) =>
    p.categories.split(",").some((c) => categories.includes(c.trim()))
  );
  const related = (sameCategory.length > 0 ? sameCategory : otherPublished).slice(0, 3);
  const postHeroes = heroIds.filter((id) => heroLookup[id]).map((id) => ({ id, name: heroLookup[id].localizedName, icon: heroLookup[id].icon }));

  const publishedAtLabel = (post.publishedAt ?? post.createdAt).toLocaleDateString("fa-IR");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ? [`${SITE_URL}${post.coverImageUrl}`] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.displayName },
    publisher: { "@type": "Organization", name: "دوتامیت" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    keywords: tags.length ? tags.join(", ") : undefined,
  };

  return (
    <div className="flex w-full flex-col items-center">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {post.coverImageUrl ? (
        <div className="relative h-[280px] w-full md:h-[420px]">
          <Image src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title} fill sizes="100vw" className="object-cover" priority />
        </div>
      ) : (
        <GeneratedCover seed={post.slug} className="h-[280px] w-full md:h-[420px]" />
      )}

      <div className="flex w-full flex-col-reverse gap-10 px-6 py-14 md:flex-row md:px-[100px] md:py-20">
        {/* Sidebar — renders second in DOM so it lands on the right in RTL, matching Figma. */}
        <Reveal className="flex w-full flex-col gap-6 md:w-[340px] md:shrink-0" y={16}>
          <Card tone="surface-alt" className="gap-5">
            <p className="w-full text-right text-base font-black text-text" dir="auto">
              درباره دوتامیت
            </p>
            <p className="w-full text-right text-[13px] leading-[1.8] text-text-dim" dir="auto">
              دوتامیت اولین پلتفرم تخصصی و کاملاً رایگان برای بازیکنان دوتا ۲ در ایران است. هدف ما
              ایجاد بستری سالم و بدون تعصب برای هماهنگی، تمرین و بازی‌های رنک رول به دور از
              هم‌تیمی‌های سمی است.
            </p>
            <Button asChild className="w-full">
              <Link href="/signup">هم‌اکنون هم‌تیمی پیدا کنید</Link>
            </Button>
          </Card>

          {hotPosts.length > 0 && (
            <Card tone="surface-alt" className="gap-4">
              <p className="w-full text-right text-base font-black text-text" dir="auto">
                داغ‌ترین مطالب هفته
              </p>
              <div className="flex w-full flex-col">
                {hotPosts.map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className={`flex w-full flex-col gap-1.5 py-3 ${
                      i < hotPosts.length - 1 ? "border-b border-border" : ""
                    } ${i === 0 ? "pt-0" : ""}`}
                  >
                    <p className="w-full text-right text-sm font-bold text-accent" dir="auto">
                      {p.title}
                    </p>
                    <p className="w-full text-right text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                      {(p.publishedAt ?? p.createdAt).toLocaleDateString("fa-IR")} •{" "}
                      {estimateReadTime(p.body as unknown as ContentBlock[]).toLocaleString("fa-IR")} دقیقه
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </Reveal>

        {/* Article */}
        <div className="flex w-full flex-1 flex-col gap-8">
          <Reveal className="flex w-full flex-col items-end gap-4">
            <div className="flex flex-wrap justify-end gap-2">
              {categories.map((c) => (
                <span key={c} className="rounded-full bg-primary px-4 py-1.5 text-xs font-extrabold text-white" dir="auto">
                  {c}
                </span>
              ))}
            </div>
            <h1
              className="w-full text-balance text-right text-[28px] font-black leading-[1.4] text-text md:text-[36px]"
              dir="auto"
            >
              {post.title}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm font-extrabold text-text" dir="auto">
                  {post.author.displayName}
                </p>
                <p className="text-xs text-[rgba(255,255,255,0.5)]" dir="auto">
                  منتشر شده در {publishedAtLabel} • {readTimeMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
                </p>
              </div>
              <HeroAvatar name={post.author.displayName} size={48} />
            </div>
          </Reveal>

          <div className="h-px w-full bg-border" />

          <Reveal className="flex w-full flex-col items-end gap-6" y={16}>
            {body.map((block, i) => {
              if (block.type === "heading") {
                return (
                  <h2 key={i} className="w-full text-right text-xl font-black text-text md:text-[22px]" dir="auto">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "blockquote") {
                return (
                  <blockquote
                    key={i}
                    className="w-full rounded-l-[8px] border-r-4 border-primary bg-surface-alt px-6 py-4 text-right text-base leading-[1.8] text-accent"
                    dir="auto"
                  >
                    {block.text}
                  </blockquote>
                );
              }
              if (block.type === "image") {
                return (
                  <figure key={i} className="flex w-full flex-col gap-2">
                    {block.url ? (
                      <div className="relative h-[280px] w-full overflow-hidden rounded-[12px] md:h-[360px]">
                        <Image src={block.url} alt={block.alt || post.title} fill sizes="(min-width: 768px) 700px, 100vw" className="object-cover" />
                      </div>
                    ) : (
                      <GeneratedCover seed={`${post.slug}-${i}`} className="h-[280px] w-full rounded-[12px] md:h-[360px]" />
                    )}
                    {block.caption && (
                      <figcaption className="w-full text-center text-xs text-[rgba(255,255,255,0.5)]" dir="auto">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              return (
                <p key={i} className="w-full text-right text-base leading-[1.8] text-text-dim" dir="auto">
                  {block.text}
                </p>
              );
            })}
          </Reveal>

          {postHeroes.length > 0 && (
            <div className="flex w-full flex-col items-end gap-2">
              <p className="text-[13px] font-bold text-text" dir="auto">
                این مقاله درباره:
              </p>
              <div className="flex w-full flex-wrap justify-end gap-2">
                {postHeroes.map((hero) => (
                  <span
                    key={hero.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface-alt py-1 pl-3 pr-1.5 text-xs font-bold text-text"
                    dir="auto"
                  >
                    <Image src={hero.icon} alt="" width={22} height={22} className="rounded-[4px]" />
                    {hero.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs text-text-dim" dir="auto">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <>
              <div className="h-px w-full bg-border" />
              <div className="flex w-full flex-col items-end gap-6">
                <p className="w-full text-right text-lg font-black text-text" dir="auto">
                  مطالب مرتبط
                </p>
                <RevealGroup className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
                  {related.map((p) => (
                    <Link key={p.slug} href={`/blog/${p.slug}`} className="block">
                      <Card tone="surface-alt" className="h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary">
                        <div className="relative h-[160px] w-full">
                          {p.coverImageUrl ? (
                            <Image src={p.coverImageUrl} alt={p.coverImageAlt ?? p.title} fill sizes="33vw" className="object-cover" />
                          ) : (
                            <GeneratedCover seed={p.slug} className="h-full w-full" />
                          )}
                        </div>
                        <div className="flex w-full flex-col items-end gap-3 p-4">
                          <p className="w-full truncate text-right text-sm font-black text-text" dir="auto">
                            {p.title}
                          </p>
                          <p className="w-full text-right text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                            {(p.publishedAt ?? p.createdAt).toLocaleDateString("fa-IR")} •{" "}
                            {estimateReadTime(p.body as unknown as ContentBlock[]).toLocaleString("fa-IR")} دقیقه
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </RevealGroup>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
