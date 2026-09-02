"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { PageBanner } from "@/components/general/pageBanner";
import { Chip } from "@/components/general/chip";
import { Card } from "@/components/general/card";
import { GeneratedCover } from "@/components/general/generatedCover";
import { Pagination } from "@/components/general/pagination";
import { BLOG_CATEGORIES, getPagedPosts, type BlogCategory } from "@/app/lib/blogPosts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FILTERS: (BlogCategory | "همه مقالات")[] = ["همه مقالات", ...BLOG_CATEGORIES];

export function BlogListContent() {
  const [category, setCategory] = useState<BlogCategory | "همه مقالات">("همه مقالات");
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const { posts, totalPages } = getPagedPosts(page, category);

  // Mount-only: filter row entrance + the initial one-by-one reveal of cards.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-filter-card]", { autoAlpha: 0, y: 16, duration: 0.5, ease: "power2.out" });

        gsap.set("[data-blog-card]", { autoAlpha: 0, y: 20 });
        ScrollTrigger.batch("[data-blog-card]", {
          start: "top 88%",
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }),
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  // Only the results grid transitions when the filter or page changes —
  // the banner and filter chips never replay.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!resultsRef.current) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    gsap.fromTo(
      resultsRef.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }
    );
  }, [category, page]);

  function handleCategory(next: BlogCategory | "همه مقالات") {
    setCategory(next);
    setPage(1);
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <PageBanner
        eyebrow="آخرین مطالب و مقالات"
        title="وبلاگ دوتامیت"
        subtitle="آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="flex w-full flex-col gap-8">
          <div data-filter-card className="flex w-full flex-wrap justify-center gap-2">
            {FILTERS.map((f) => (
              <Chip key={f} active={category === f} onClick={() => handleCategory(f)}>
                {f}
              </Chip>
            ))}
          </div>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} data-blog-card className="block">
                  <Card noHover className="h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary">
                    <GeneratedCover seed={post.slug} className="h-[200px] w-full" />
                    <div className="flex w-full flex-col items-start gap-3 p-5">
                      <div className="flex w-full items-center justify-between">
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">{post.date}</p>
                        <span className="rounded-[4px] bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-accent">
                          {post.category}
                        </span>
                      </div>
                      <p
                        className="w-full truncate text-right text-base font-black text-text"
                        dir="auto"
                      >
                        {post.title}
                      </p>
                      <p
                        className="line-clamp-2 w-full text-right text-[13px] leading-[1.6] text-text-dim"
                        dir="auto"
                      >
                        {post.excerpt}
                      </p>
                      <div className="flex w-full items-start border-t border-border pt-2">
                        <p className="flex-1 text-right text-[13px] font-bold text-accent" dir="auto">
                          مشاهده مقاله ←
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {posts.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-text-dim">
                مقاله‌ای در این دسته پیدا نشد.
              </p>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
