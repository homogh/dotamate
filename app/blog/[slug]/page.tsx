import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/general/reveal";
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

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <article className="flex w-full flex-col items-center px-6 py-20 md:px-[100px]">
      <Reveal className="flex w-full max-w-[720px] flex-col gap-4">
        <span className="w-fit rounded-full border border-accent bg-primary/15 px-3 py-1 text-xs font-bold text-accent" dir="auto">
          {post.category}
        </span>
        <h1 className="w-full text-right text-[32px] font-black text-text" dir="auto">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-dim" dir="auto">
          <span>{post.author}</span>
          <span>·</span>
          <span>{post.date}</span>
        </div>
      </Reveal>

      <Reveal className="mt-10 flex w-full max-w-[720px] flex-col gap-5" y={16}>
        {post.content.map((paragraph, i) => (
          <p key={i} className="w-full text-right text-base leading-[1.9] text-text-dim" dir="auto">
            {paragraph}
          </p>
        ))}
      </Reveal>

      {related.length > 0 && (
        <div className="mt-16 flex w-full max-w-[720px] flex-col gap-4 border-t border-border pt-10">
          <p className="w-full text-right text-sm font-black text-text" dir="auto">
            مطالب مرتبط
          </p>
          <div className="flex flex-col gap-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="text-right text-sm font-bold text-accent"
                dir="auto"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
