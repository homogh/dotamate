"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Heading2,
  ImagePlus,
  Loader2,
  Quote,
  Text,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "@/components/general/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/app/stores/useToast";
import { BLOG_CATEGORIES, estimateReadTime, type ContentBlock } from "@/app/lib/blogPosts";

interface HeroOption {
  id: number;
  name: string;
  icon: string;
}

function slugifyClient(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/blog/upload", { method: "POST", body: form });
  const json = await res.json();
  if (json.status !== "success") throw new Error(json.message ?? "آپلود ناموفق بود.");
  return json.data.url as string;
}

const BLOCK_LABEL: Record<ContentBlock["type"], string> = {
  paragraph: "پاراگراف",
  heading: "تیتر",
  blockquote: "نقل‌قول",
  image: "تصویر",
};

interface EditorState {
  title: string;
  slug: string;
  categories: string[];
  heroIds: number[];
  tags: string[];
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  body: ContentBlock[];
  status: string;
}

const EMPTY_STATE: EditorState = {
  title: "",
  slug: "",
  categories: [BLOG_CATEGORIES[0]],
  heroIds: [],
  tags: [],
  excerpt: "",
  coverImageUrl: null,
  coverImageAlt: "",
  metaTitle: "",
  metaDescription: "",
  body: [{ type: "paragraph", text: "" }],
  status: "DRAFT",
};

export function BlogEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = postId !== undefined;

  const [loading, setLoading] = useState(isEdit);
  const [state, setState] = useState<EditorState>(EMPTY_STATE);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [tagInput, setTagInput] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [blockUploadingIndex, setBlockUploadingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | "schedule" | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [heroOptions, setHeroOptions] = useState<HeroOption[]>([]);
  const [heroSearch, setHeroSearch] = useState("");

  const coverInputRef = useRef<HTMLInputElement>(null);
  const blockInputRef = useRef<HTMLInputElement>(null);
  const pendingBlockIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/blog/${postId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        const p = json.data;
        setState({
          title: p.title,
          slug: p.slug,
          categories: p.categories?.length ? p.categories : [BLOG_CATEGORIES[0]],
          heroIds: p.heroIds ?? [],
          tags: p.tags ?? [],
          excerpt: p.excerpt ?? "",
          coverImageUrl: p.coverImageUrl,
          coverImageAlt: p.coverImageAlt ?? "",
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          body: p.body?.length ? p.body : EMPTY_STATE.body,
          status: p.status,
        });
      })
      .finally(() => setLoading(false));
  }, [isEdit, postId]);

  useEffect(() => {
    fetch("/api/meta/heroes", { cache: "force-cache" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== "success") return;
        setHeroOptions(
          (json.data as { id: number; name: string; icon: string }[])
            .map((h) => ({ id: h.id, name: h.name, icon: h.icon }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      })
      .catch(() => undefined);
  }, []);

  function updateTitle(title: string) {
    setState((s) => ({ ...s, title, slug: slugTouched ? s.slug : slugifyClient(title) }));
  }

  function updateBlock(index: number, patch: Partial<ContentBlock>) {
    setState((s) => ({
      ...s,
      body: s.body.map((b, i) => (i === index ? ({ ...b, ...patch } as ContentBlock) : b)),
    }));
  }

  function addBlock(type: ContentBlock["type"]) {
    const block: ContentBlock =
      type === "paragraph"
        ? { type, text: "" }
        : type === "heading"
          ? { type, text: "" }
          : type === "blockquote"
            ? { type, text: "" }
            : { type: "image", url: "", alt: "", caption: "" };
    setState((s) => ({ ...s, body: [...s.body, block] }));
  }

  function removeBlock(index: number) {
    setState((s) => ({ ...s, body: s.body.filter((_, i) => i !== index) }));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setState((s) => {
      const target = index + dir;
      if (target < 0 || target >= s.body.length) return s;
      const body = [...s.body];
      [body[index], body[target]] = [body[target], body[index]];
      return { ...s, body };
    });
  }

  function toggleCategory(cat: string) {
    setState((s) => {
      if (s.categories.includes(cat)) {
        if (s.categories.length === 1) {
          toast.error("حداقل یه دسته‌بندی باید فعال بمونه.");
          return s;
        }
        return { ...s, categories: s.categories.filter((c) => c !== cat) };
      }
      return { ...s, categories: [...s.categories, cat] };
    });
  }

  function toggleHero(heroId: number) {
    setState((s) => ({
      ...s,
      heroIds: s.heroIds.includes(heroId) ? s.heroIds.filter((id) => id !== heroId) : [...s.heroIds, heroId],
    }));
  }

  function addTag() {
    const value = tagInput.trim().replace(/^#/, "");
    if (!value || state.tags.includes(value)) {
      setTagInput("");
      return;
    }
    setState((s) => ({ ...s, tags: [...s.tags, value] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setState((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));
  }

  async function handleCoverPick(file: File) {
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      setState((s) => ({ ...s, coverImageUrl: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "آپلود کاور ناموفق بود.");
    } finally {
      setCoverUploading(false);
    }
  }

  const openBlockImagePicker = useCallback((index: number) => {
    pendingBlockIndex.current = index;
    blockInputRef.current?.click();
  }, []);

  async function handleBlockImagePick(file: File) {
    const index = pendingBlockIndex.current;
    if (index === null) return;
    setBlockUploadingIndex(index);
    try {
      const url = await uploadImage(file);
      updateBlock(index, { url } as Partial<ContentBlock>);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.");
    } finally {
      setBlockUploadingIndex(null);
    }
  }

  async function handleSubmit(mode: "draft" | "publish" | "schedule") {
    if (!state.title.trim() || state.categories.length === 0) {
      toast.error("عنوان و حداقل یه دسته‌بندی رو کامل کن.");
      return;
    }
    const hasText = state.body.some((b) => b.type !== "image" && b.text.trim());
    if (!hasText) {
      toast.error("حداقل یه بلاک متنی با محتوا لازمه.");
      return;
    }
    if (mode === "schedule" && !scheduledAt) {
      toast.error("زمان انتشار رو مشخص کن.");
      return;
    }

    setSubmitting(mode);
    const payload = {
      title: state.title.trim(),
      slug: state.slug || undefined,
      categories: state.categories,
      heroIds: state.heroIds,
      tags: state.tags,
      excerpt: state.excerpt.trim(),
      body: state.body,
      coverImageUrl: state.coverImageUrl,
      coverImageAlt: state.coverImageAlt.trim() || null,
      metaTitle: state.metaTitle.trim() || null,
      metaDescription: state.metaDescription.trim() || null,
      publishNow: mode === "publish",
      saveAsDraft: mode === "draft",
      scheduledAt: mode === "schedule" ? scheduledAt : null,
    };

    try {
      const res = await fetch(isEdit ? `/api/admin/blog/${postId}` : "/api/admin/blog", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status !== "success") {
        toast.error(json.message ?? "ذخیره ناموفق بود.");
        return;
      }
      toast.success(isEdit ? "تغییرات ذخیره شد." : "مقاله ذخیره شد.");
      router.push("/admin/blog");
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <Card tone="surface" noHover className="w-full gap-4 p-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  const wordCount = state.body.reduce(
    (sum, b) => (b.type === "image" ? sum : sum + b.text.trim().split(/\s+/).filter(Boolean).length),
    0
  );

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCoverPick(file);
          e.target.value = "";
        }}
      />
      <input
        ref={blockInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleBlockImagePick(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-1 flex-col gap-6">
        <Card tone="surface" noHover className="w-full gap-5 p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title">عنوان مقاله</Label>
            <Input id="post-title" value={state.title} onChange={(e) => updateTitle(e.target.value)} placeholder="عنوان کامل مقاله" dir="auto" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-slug">نامک (Slug)</Label>
            <div className="flex w-full items-center gap-2">
              <Input
                id="post-slug"
                value={state.slug}
                onChange={(e) => setState((s) => ({ ...s, slug: slugifyClient(e.target.value) }))}
                disabled={!slugTouched}
                dir="ltr"
                className="flex-1 disabled:opacity-70"
              />
              {!slugTouched && (
                <Button type="button" variant="outline" size="sm" onClick={() => setSlugTouched(true)}>
                  ویرایش
                </Button>
              )}
            </div>
            <p className="text-[11px] text-text-dim" dir="ltr">
              /blog/{state.slug || "..."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-excerpt">خلاصه مقاله (برای کارت‌ها)</Label>
            <Textarea
              id="post-excerpt"
              value={state.excerpt}
              onChange={(e) => setState((s) => ({ ...s, excerpt: e.target.value }))}
              placeholder="اگه خالی بمونه، از اولین پاراگراف ساخته می‌شه."
              className="min-h-20 bg-surface-alt"
              dir="auto"
            />
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full gap-5 p-6">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            محتوای مقاله
          </p>

          <div className="flex w-full flex-col gap-4">
            {state.body.map((block, index) => (
              <div key={index} className="flex w-full flex-col gap-3 rounded-[10px] border border-border bg-surface-alt p-4">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      className="flex size-7 items-center justify-center rounded-[6px] text-text-dim transition-colors hover:bg-surface disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === state.body.length - 1}
                      className="flex size-7 items-center justify-center rounded-[6px] text-text-dim transition-colors hover:bg-surface disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="flex size-7 items-center justify-center rounded-[6px] text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Badge variant="outline" className="text-text-dim">
                    {BLOCK_LABEL[block.type]}
                  </Badge>
                </div>

                {block.type === "image" ? (
                  <div className="flex w-full flex-col gap-3">
                    {block.url ? (
                      <div className="relative h-[160px] w-full overflow-hidden rounded-[8px]">
                        <Image src={block.url} alt={block.alt || ""} fill sizes="600px" className="object-cover" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBlockImagePicker(index)}
                        disabled={blockUploadingIndex === index}
                        className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-border text-text-dim transition-colors hover:border-accent/50 hover:text-text"
                      >
                        {blockUploadingIndex === index ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                        <span className="text-[12px]" dir="auto">
                          {blockUploadingIndex === index ? "در حال آپلود..." : "انتخاب تصویر"}
                        </span>
                      </button>
                    )}
                    {block.url && (
                      <Button type="button" variant="outline" size="sm" onClick={() => openBlockImagePicker(index)} disabled={blockUploadingIndex === index}>
                        تعویض تصویر
                      </Button>
                    )}
                    <Input
                      value={block.alt}
                      onChange={(e) => updateBlock(index, { alt: e.target.value } as Partial<ContentBlock>)}
                      placeholder="متن جایگزین تصویر (alt) — برای سئو و دسترسی‌پذیری"
                      dir="auto"
                    />
                    <Input
                      value={block.caption ?? ""}
                      onChange={(e) => updateBlock(index, { caption: e.target.value } as Partial<ContentBlock>)}
                      placeholder="زیرنویس تصویر (اختیاری)"
                      dir="auto"
                    />
                  </div>
                ) : block.type === "heading" ? (
                  <Input
                    value={block.text}
                    onChange={(e) => updateBlock(index, { text: e.target.value } as Partial<ContentBlock>)}
                    placeholder="متن تیتر"
                    className="font-black"
                    dir="auto"
                  />
                ) : (
                  <Textarea
                    value={block.text}
                    onChange={(e) => updateBlock(index, { text: e.target.value } as Partial<ContentBlock>)}
                    placeholder={block.type === "blockquote" ? "متن نقل‌قول" : "متن پاراگراف"}
                    className="min-h-24 bg-surface"
                    dir="auto"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex w-full flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("paragraph")}>
              <Text size={14} /> پاراگراف
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("heading")}>
              <Heading2 size={14} /> تیتر
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("blockquote")}>
              <Quote size={14} /> نقل‌قول
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")}>
              <ImagePlus size={14} /> تصویر
            </Button>
            <span className="mr-auto self-center text-[11px] text-text-dim" dir="auto">
              {wordCount.toLocaleString("fa-IR")} کلمه · {estimateReadTime(state.body).toLocaleString("fa-IR")} دقیقه مطالعه
            </span>
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full gap-5 p-6">
          <p className="w-full text-right text-[16px] font-black text-text" dir="auto">
            سئو (SEO)
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] text-text-dim" dir="ltr">
                {state.metaTitle.length}/60
              </span>
              <Label htmlFor="meta-title">عنوان سئو (اختیاری)</Label>
            </div>
            <Input
              id="meta-title"
              value={state.metaTitle}
              onChange={(e) => setState((s) => ({ ...s, metaTitle: e.target.value }))}
              placeholder={state.title || "اگه خالی بمونه، از عنوان مقاله استفاده می‌شه"}
              dir="auto"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] text-text-dim" dir="ltr">
                {state.metaDescription.length}/160
              </span>
              <Label htmlFor="meta-desc">توضیحات متا (اختیاری)</Label>
            </div>
            <Textarea
              id="meta-desc"
              value={state.metaDescription}
              onChange={(e) => setState((s) => ({ ...s, metaDescription: e.target.value }))}
              placeholder={state.excerpt || "اگه خالی بمونه، از خلاصه مقاله استفاده می‌شه"}
              className="min-h-20 bg-surface-alt"
              dir="auto"
            />
          </div>

          <div className="flex w-full flex-col gap-1.5 rounded-[8px] border border-border bg-surface-alt p-4" dir="ltr">
            <p className="truncate text-[13px] text-[#8ab4f8]">{state.metaTitle || state.title || "عنوان مقاله"}</p>
            <p className="truncate text-[12px] text-[#34a853]">dotamate.ir/blog/{state.slug || "post-slug"}</p>
            <p className="line-clamp-2 text-[12px] text-[#bdc1c6]">
              {state.metaDescription || state.excerpt || "توضیحات مقاله اینجا در نتایج گوگل نمایش داده می‌شه."}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-[320px] lg:shrink-0">
        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text" dir="auto">
            دسته‌بندی
          </p>
          <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
            می‌تونی چندتا رو هم‌زمان فعال کنی — مثلاً یه مقاله هم متا هم آپدیت باشه.
          </p>
          <div className="flex w-full flex-wrap gap-2">
            {BLOG_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  state.categories.includes(c) ? "border-primary bg-primary text-white" : "border-border bg-surface-alt text-text-dim hover:text-text"
                }`}
                dir="auto"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text" dir="auto">
            هیروهای مرتبط
          </p>
          <p className="w-full text-right text-[11px] text-text-dim" dir="auto">
            اگه مقاله درباره‌ی تغییرات یک یا چند هیرو خاصه، اینجا مشخصشون کن.
          </p>

          {state.heroIds.length > 0 && (
            <div className="flex w-full flex-wrap gap-2">
              {state.heroIds.map((id) => {
                const hero = heroOptions.find((h) => h.id === id);
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 rounded-full bg-accent/15 py-1 pl-2.5 pr-1 text-[11px] font-bold text-accent"
                    dir="auto"
                  >
                    {hero?.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hero.icon} alt="" className="size-5 rounded-[4px]" />
                    )}
                    {hero?.name ?? `#${id}`}
                    <button type="button" onClick={() => toggleHero(id)} className="text-accent/70 hover:text-accent">
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <Input value={heroSearch} onChange={(e) => setHeroSearch(e.target.value)} placeholder="جستجوی هیرو..." dir="auto" />

          <div className="flex max-h-[220px] w-full flex-col gap-1 overflow-y-auto rounded-[8px] border border-border bg-surface-alt p-1.5">
            {heroOptions.length === 0 ? (
              <p className="w-full py-4 text-center text-[12px] text-text-dim" dir="auto">
                در حال بارگذاری لیست هیروها...
              </p>
            ) : (
              heroOptions
                .filter((h) => h.name.toLowerCase().includes(heroSearch.trim().toLowerCase()))
                .map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => toggleHero(hero.id)}
                    className={`flex w-full items-center gap-2 rounded-[6px] p-1.5 text-right text-[12px] transition-colors ${
                      state.heroIds.includes(hero.id) ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-surface hover:text-text"
                    }`}
                    dir="auto"
                  >
                    {hero.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hero.icon} alt="" className="size-6 rounded-[4px]" />
                    )}
                    {hero.name}
                  </button>
                ))
            )}
          </div>
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text" dir="auto">
            تگ‌ها
          </p>
          <div className="flex w-full flex-wrap gap-2">
            {state.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent" dir="auto">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-accent/70 hover:text-accent">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="تگ رو بنویس و Enter بزن"
            dir="auto"
          />
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text" dir="auto">
            تصویر کاور
          </p>
          {state.coverImageUrl ? (
            <div className="relative h-[140px] w-full overflow-hidden rounded-[8px]">
              <Image src={state.coverImageUrl} alt={state.coverImageAlt || ""} fill sizes="320px" className="object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-border text-text-dim transition-colors hover:border-accent/50 hover:text-text"
            >
              {coverUploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-[12px]" dir="auto">
                {coverUploading ? "در حال آپلود..." : "انتخاب تصویر کاور"}
              </span>
            </button>
          )}
          {state.coverImageUrl && (
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                تعویض
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setState((s) => ({ ...s, coverImageUrl: null }))}>
                حذف
              </Button>
            </div>
          )}
          <Input
            value={state.coverImageAlt}
            onChange={(e) => setState((s) => ({ ...s, coverImageAlt: e.target.value }))}
            placeholder="متن جایگزین کاور (alt)"
            dir="auto"
          />
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[14px] font-black text-text" dir="auto">
            انتشار
          </p>
          {isEdit && (
            <p className="w-full text-right text-[12px] text-text-dim" dir="auto">
              وضعیت فعلی: <span className="font-bold text-text">{state.status}</span>
            </p>
          )}

          <Button type="button" className="w-full" disabled={submitting !== null} onClick={() => handleSubmit("publish")}>
            {submitting === "publish" ? "در حال انتشار..." : "انتشار فوری"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={submitting !== null} onClick={() => handleSubmit("draft")}>
            {submitting === "draft" ? "در حال ذخیره..." : "ذخیره پیش‌نویس"}
          </Button>

          <div className="flex w-full items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setScheduleEnabled((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${scheduleEnabled ? "bg-primary" : "border border-border bg-surface-alt"}`}
            >
              <span className="absolute top-0.5 size-4 rounded-full bg-white transition-[right] duration-200" style={{ right: scheduleEnabled ? 2 : 18 }} />
            </button>
            <span className="text-[13px] text-text" dir="auto">
              زمان‌بندی انتشار
            </span>
          </div>
          {scheduleEnabled && (
            <div className="flex w-full flex-col gap-2">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} dir="ltr" />
              <Button type="button" variant="outline" className="w-full" disabled={submitting !== null} onClick={() => handleSubmit("schedule")}>
                {submitting === "schedule" ? "در حال ذخیره..." : "زمان‌بندی انتشار"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
