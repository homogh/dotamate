import prisma from "@/app/lib/prisma";
import { slugify } from "@/app/lib/blogSlug";

/** Same slug rules as the blog; appends -2, -3, ... until free (ignoring the product being edited). */
export async function uniqueProductSlug(input: string, excludeId?: number) {
  const base = slugify(input) || `product-${Date.now()}`;
  let candidate = base;
  let n = 1;
  for (;;) {
    const clash = await prisma.shopProduct.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
