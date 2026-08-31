import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/general/sectionHeading";
import { Card } from "@/components/general/card";
import { Reveal } from "@/components/general/reveal";
import { RevealGroup } from "@/components/general/revealGroup";
import { BLOG_POSTS } from "@/app/lib/blogPosts";

export const metadata: Metadata = {
  title: "وبلاگ | دوتامیت",
  description: "راهنما، متای پچ جدید و اخبار دوتامیت برای بازیکنان Dota 2.",
};

export default function BlogListPage() {
  return (
    <section className="flex w-full flex-col items-start gap-14 px-6 py-20 md:px-[100px]">
      <Reveal className="w-full">
        <SectionHeading
          eyebrow="وبلاگ دوتامیت"
          title="راهنما، متا و اخبار"
          subtitle="هرچیزی که برای بهتر بازی‌کردن و پیدا کردن هم‌تیمی لازم داری"
        />
      </Reveal>

      <RevealGroup className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
            <Card className="h-full gap-4 transition-colors hover:border-primary">
              <span className="rounded-full border border-accent bg-primary/15 px-3 py-1 text-xs font-bold text-accent">
                {post.category}
              </span>
              <p className="w-full text-right text-lg font-black text-text" dir="auto">
                {post.title}
              </p>
              <p className="w-full flex-1 text-right text-sm leading-[1.7] text-text-dim" dir="auto">
                {post.excerpt}
              </p>
              <p className="w-full text-right text-xs text-text-dim" dir="auto">
                {post.date}
              </p>
            </Card>
          </Link>
        ))}
      </RevealGroup>
    </section>
  );
}
