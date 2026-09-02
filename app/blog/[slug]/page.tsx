import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";
import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { GeneratedCover } from "@/components/general/generatedCover";
import { HeroAvatar } from "@/components/general/heroAvatar";
import { BLOG_POSTS } from "@/app/lib/blogPosts";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  return {
    title: post ? `${post.title} | وبلاگ دوتامیت` : "وبلاگ دوتامیت",
    description: post?.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const related = post.relatedSlugs
    .map((s) => BLOG_POSTS.find((p) => p.slug === s))
    .filter((p): p is (typeof BLOG_POSTS)[number] => Boolean(p))
    .slice(0, 3);

  const hotPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="flex w-full flex-col items-center">
      <GeneratedCover seed={post.slug} className="h-[280px] w-full md:h-[420px]" />

      <div className="flex w-full flex-col-reverse gap-10 px-6 py-14 md:flex-row md:px-[100px] md:py-20">
        {/* Sidebar — renders second in DOM so it lands on the right in RTL, matching Figma. */}
        <Reveal className="flex w-full flex-col gap-6 md:w-[340px] md:shrink-0" y={16}>
          <Card tone="surface-alt" className="gap-5">
            <p className="w-full text-right text-base font-black text-text" dir="auto">
              درباره دوتامیت
            </p>
            <p className="w-full text-right text-[13px] leading-[1.8] text-text-dim" dir="auto">
              دوتامیت اولین پلتفرم تخصصی و کاملاً رایگان برای بازیکنان دوتا ۲ در ایران است. هدف ما
              ایجاد بستری سالم و بدون تعصب برای هماهنگی، تمرین و بازی‌های رنکد رول به دور از
              هم‌تیمی‌های سمی است.
            </p>
            <Button asChild className="w-full">
              <Link href="/signup">هم‌اکنون هم‌تیمی پیدا کنید</Link>
            </Button>
          </Card>

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
                    {p.date} • {p.readTime}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* Article */}
        <div className="flex w-full flex-1 flex-col gap-8">
          <Reveal className="flex w-full flex-col items-end gap-4">
            <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-extrabold text-white" dir="auto">
              {post.category}
            </span>
            <h1
              className="w-full text-balance text-right text-[28px] font-black leading-[1.4] text-text md:text-[36px]"
              dir="auto"
            >
              {post.title}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm font-extrabold text-text" dir="auto">
                  {post.author}
                </p>
                <p className="text-xs text-[rgba(255,255,255,0.5)]" dir="auto">
                  منتشر شده در {post.publishedAt} • {post.readTime}
                </p>
              </div>
              <HeroAvatar name={post.author} size={48} />
            </div>
          </Reveal>

          <div className="h-px w-full bg-border" />

          <Reveal className="flex w-full flex-col items-end gap-6" y={16}>
            {post.body.map((block, i) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={i}
                    className="w-full text-right text-xl font-black text-text md:text-[22px]"
                    dir="auto"
                  >
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
                    <GeneratedCover seed={`${post.slug}-${i}`} className="h-[280px] w-full rounded-[12px] md:h-[360px]" />
                    <figcaption
                      className="w-full text-center text-xs text-[rgba(255,255,255,0.5)]"
                      dir="auto"
                    >
                      {block.caption}
                    </figcaption>
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
                      <Card
                        tone="surface-alt"
                        className="h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary"
                      >
                        <GeneratedCover seed={p.slug} className="h-[160px] w-full" />
                        <div className="flex w-full flex-col items-end gap-3 p-4">
                          <p className="w-full truncate text-right text-sm font-black text-text" dir="auto">
                            {p.title}
                          </p>
                          <p className="w-full text-right text-[11px] text-[rgba(255,255,255,0.5)]" dir="auto">
                            {p.date} • {p.readTime}
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
