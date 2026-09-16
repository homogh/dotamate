import prisma from "@/app/lib/prisma";

export function slugify(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^؀-ۿa-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

/** Appends -2, -3, ... until the slug is free (ignoring the post being edited, if any). */
export async function uniqueSlug(base: string, excludeId?: number) {
  let candidate = base;
  let n = 1;
  for (;;) {
    const clash = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
