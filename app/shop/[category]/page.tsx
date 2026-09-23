import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryProducts, getViewerSession } from "@/app/lib/shopCatalog";
import { getShopCategory } from "@/app/lib/shopCategories";
import { canUseMarket } from "@/app/lib/shopAccess";
import { Card } from "@/components/general/card";
import { CategoryShell, categoryHref, parsePageParam, parseSortParam } from "@/components/pages/shop/categoryShell";
import { ProductCard } from "@/components/pages/shop/productCard";
import { ShopPagination } from "@/components/pages/shop/shopPagination";

// The user market has its own route (app/shop/market) — this page serves the store's own product types.
function storeCategory(key: string) {
  const category = getShopCategory(key);
  return category?.type ? category : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category: key } = await params;
  const category = storeCategory(key);
  if (!category) return {};

  const page = parsePageParam((await searchParams).page);
  const suffix = page > 1 ? ` — صفحه ${page.toLocaleString("fa-IR")}` : "";
  // Page 2+ keep their own canonical; sort variants collapse onto the unsorted URL.
  const canonical = page > 1 ? `/shop/${category.key}?page=${page}` : `/shop/${category.key}`;

  return {
    title: category.metaTitle + suffix,
    description: category.metaDescription,
    alternates: { canonical },
    openGraph: { title: category.metaTitle, description: category.metaDescription, url: canonical, type: "website" },
  };
}

export default async function ShopCategoryPage({ params, searchParams }: PageProps<"/shop/[category]">) {
  const { category: key } = await params;
  const category = storeCategory(key);
  if (!category?.type) notFound();

  const query = await searchParams;
  const sort = parseSortParam(query.sort);
  const viewer = await getViewerSession();
  const [listing, showMarket] = await Promise.all([getCategoryProducts(category.type, parsePageParam(query.page), sort), canUseMarket(viewer?.id ?? null)]);

  return (
    <CategoryShell category={category} sort={sort} showSort={listing.total > 1} sortHref={(s) => categoryHref(category.key, 1, s)} showMarket={showMarket}>
      {listing.products.length === 0 ? (
        <Card tone="surface-alt" noHover className="w-full items-center p-12">
          <p className="text-[14px] text-text-dim">فعلاً محصولی در این دسته نیست.</p>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-text-dim">{listing.total.toLocaleString("fa-IR")} محصول</p>
          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listing.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <ShopPagination page={listing.page} totalPages={listing.totalPages} hrefFor={(p) => categoryHref(category.key, p, sort)} />
        </>
      )}
    </CategoryShell>
  );
}
