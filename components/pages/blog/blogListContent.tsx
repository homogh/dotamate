"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Swords, X } from "lucide-react";

import { PageBanner } from "@/components/general/pageBanner";
import { Chip } from "@/components/general/chip";
import { Card } from "@/components/general/card";
import { GeneratedCover } from "@/components/general/generatedCover";
import { Pagination } from "@/components/general/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BLOG_CATEGORIES, matchesFacets, paginate, type BlogHeroRef, type PublicBlogPostSummary } from "@/app/lib/blogPosts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function BlogListContent({ posts, allHeroes }: { posts: PublicBlogPostSummary[]; allHeroes: BlogHeroRef[] }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedHeroId, setSelectedHeroId] = useState<number | null>(null);
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => posts.filter((p) => matchesFacets(p, selectedCategories, selectedHeroId !== null ? [selectedHeroId] : [])),
    [posts, selectedCategories, selectedHeroId]
  );
  const { items: pagePosts, totalPages } = paginate(filtered, page);

  // Mount-only: filter row entrance + the initial one-by-one reveal of cards.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.set("[data-filter-card]", { autoAlpha: 0, y: 16 });
      gsap.to("[data-filter-card]", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });

      gsap.set("[data-blog-card]", { autoAlpha: 0, y: 20 });
      ScrollTrigger.batch("[data-blog-card]", {
        start: "top 88%",
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }),
      });
    },
    { scope: containerRef }
  );

  function replayResults() {
    if (!resultsRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    gsap.fromTo(resultsRef.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" });
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    setPage(1);
    replayResults();
  }

  function pickHero(heroId: number) {
    setSelectedHeroId((prev) => (prev === heroId ? null : heroId));
    setPage(1);
    setHeroModalOpen(false);
    setHeroSearch("");
    replayResults();
  }

  function clearHero() {
    setSelectedHeroId(null);
    setPage(1);
    replayResults();
  }

  const selectedHero = allHeroes.find((h) => h.id === selectedHeroId) ?? null;

  function handlePage(next: number) {
    setPage(next);
    replayResults();
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedHeroId(null);
    setPage(1);
    replayResults();
  }

  const hasActiveFilters = selectedCategories.length > 0 || selectedHeroId !== null;

  return (
    <div ref={containerRef} className="content-page flex w-full flex-col items-center">
      <PageBanner
        eyebrow="آخرین مطالب و مقالات"
        title="وبلاگ دوتامیت"
        subtitle="آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲"
        imageSrc="/images/blog-banner.png"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="flex w-full flex-col gap-8">
          <div
            data-filter-card
            className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-surface/70 p-4 shadow-[0_14px_44px_rgba(0,0,0,0.16)]"
          >
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              <Chip active={!hasActiveFilters} onClick={clearFilters}>
                همه مقالات
              </Chip>
              {BLOG_CATEGORIES.map((c) => (
                <Chip key={c} active={selectedCategories.includes(c)} onClick={() => toggleCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>

            {allHeroes.length > 0 && (
              <div className="flex w-full flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
                <span className="text-[12px] text-text-dim" dir="auto">
                  فیلتر بر اساس هیرو:
                </span>

                {selectedHero ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-primary py-1.5 pl-3 pr-1.5 text-[13px] font-bold text-white shadow-[0_0_16px_rgba(75,80,230,0.4)]">
                    {selectedHero.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedHero.icon} alt="" className="size-5 rounded-[4px]" />
                    )}
                    {selectedHero.name}
                    <button type="button" onClick={clearHero} className="text-white/70 hover:text-white" aria-label="حذف فیلتر هیرو">
                      <X size={13} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHeroModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-[13px] font-bold text-text-dim transition-colors hover:border-white/20 hover:text-text"
                    dir="auto"
                  >
                    <Swords size={14} />
                    انتخاب هیرو
                  </button>
                )}
              </div>
            )}
          </div>

          <div ref={resultsRef} className="flex w-full flex-col gap-6">
            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pagePosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} data-blog-card className="block">
                  <Card noHover className="h-full gap-0 overflow-hidden p-0 transition-colors hover:border-primary">
                    <div className="relative h-[200px] w-full">
                      {post.coverImageUrl ? (
                        <Image
                          src={post.coverImageUrl}
                          alt={post.coverImageAlt ?? post.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <GeneratedCover seed={post.slug} className="h-full w-full" />
                      )}
                    </div>
                    <div className="flex w-full flex-col items-start gap-3 p-5">
                      <div className="flex w-full items-center justify-between">
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">
                          {new Date(post.publishedAt).toLocaleDateString("fa-IR")}
                        </p>
                        <div className="flex flex-wrap justify-end gap-1">
                          {post.categories.map((c) => (
                            <span key={c} className="rounded-[4px] bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-accent">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="w-full truncate text-right text-base font-black text-text" dir="auto">
                        {post.title}
                      </p>
                      <p className="line-clamp-2 w-full text-right text-[13px] leading-[1.6] text-text-dim" dir="auto">
                        {post.excerpt}
                      </p>
                      {post.heroes.length > 0 && (
                        <div className="flex w-full flex-wrap items-center gap-1.5">
                          {post.heroes.slice(0, 4).map((hero) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={hero.id} src={hero.icon} alt={hero.name} title={hero.name} className="size-6 rounded-[4px]" />
                          ))}
                        </div>
                      )}
                      <div className="flex w-full items-center justify-between border-t border-border pt-2">
                        <p className="text-[11px] text-text-dim" dir="auto">
                          {post.readTimeMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
                        </p>
                        <p className="text-right text-[13px] font-bold text-accent" dir="auto">
                          مشاهده مقاله ←
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {pagePosts.length === 0 && (
              <p className="w-full py-12 text-center text-sm text-text-dim" dir="auto">
                {selectedHeroId !== null
                  ? "هنوز بلاگی با این فیلتر ثبت نشده."
                  : "مقاله‌ای با این فیلترها پیدا نشد."}
              </p>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={handlePage} />
          </div>
        </div>
      </div>

      <Dialog open={heroModalOpen} onOpenChange={setHeroModalOpen}>
        <DialogContent className="border-border bg-surface sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-text" dir="auto">
              انتخاب هیرو
            </DialogTitle>
          </DialogHeader>

          <Input
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            placeholder="جستجوی هیرو..."
            dir="auto"
            autoFocus
          />

          <div className="grid max-h-[360px] w-full grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {allHeroes
              .filter((h) => h.name.toLowerCase().includes(heroSearch.trim().toLowerCase()))
              .map((hero) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => pickHero(hero.id)}
                  className={`flex items-center gap-2 rounded-[8px] border p-2 text-right text-[13px] font-bold transition-colors ${
                    selectedHeroId === hero.id
                      ? "border-primary bg-primary/15 text-accent"
                      : "border-border bg-surface-alt text-text-dim hover:border-white/20 hover:text-text"
                  }`}
                  dir="auto"
                >
                  {hero.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.icon} alt="" className="size-8 rounded-[6px]" />
                  )}
                  {hero.name}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
