export type BlogCategory = "راهنما" | "آپدیت" | "متا" | "آموزش";

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "image"; url: string; alt: string; caption?: string };

export interface BlogHeroRef {
  id: number;
  name: string;
  icon: string;
}

export interface PublicBlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  categories: string[];
  tags: string[];
  heroes: BlogHeroRef[];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: string;
  readTimeMinutes: number;
}

export const BLOG_CATEGORIES: BlogCategory[] = ["راهنما", "آپدیت", "متا", "آموزش"];

export const POSTS_PER_PAGE = 6;

const WORDS_PER_MINUTE = 180;

/** Word-count based estimate, shown in both the admin editor and the public article header. */
export function estimateReadTime(body: ContentBlock[]): number {
  const wordCount = body.reduce((sum, block) => {
    if (block.type === "image") return sum;
    return sum + block.text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/**
 * A post matches a facet filter when it has no selection (facet inactive)
 * or shares at least one value with the selection — categories and heroes
 * are combined with AND, each facet's own values with OR.
 */
export function matchesFacets(
  post: { categories: string[]; heroes: BlogHeroRef[] },
  selectedCategories: string[],
  selectedHeroIds: number[]
) {
  const categoryOk = selectedCategories.length === 0 || post.categories.some((c) => selectedCategories.includes(c));
  const heroOk = selectedHeroIds.length === 0 || post.heroes.some((h) => selectedHeroIds.includes(h.id));
  return categoryOk && heroOk;
}

export function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / POSTS_PER_PAGE));
  const start = (page - 1) * POSTS_PER_PAGE;
  return { items: items.slice(start, start + POSTS_PER_PAGE), totalPages };
}
