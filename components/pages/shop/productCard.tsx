import Link from "next/link";
import { Clock, Zap } from "lucide-react";

import type { ShopListProduct } from "@/app/lib/shopCatalog";
import { productHref } from "@/app/lib/shopCategories";
import { GiftCardVisual } from "@/components/pages/shop/giftCardVisual";

export function ProductCard({ product }: { product: ShopListProduct }) {
  return (
    <Link
      href={productHref(product)}
      className="group flex flex-col gap-4 rounded-[12px] border border-border bg-surface-alt p-4 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/20"
    >
      <ProductVisual product={product} />

      <h3 className="line-clamp-2 text-right text-[15px] font-black leading-[1.6] text-text" dir="auto">
        {product.title}
      </h3>

      <div className="mt-auto flex w-full items-center justify-between">
        <DeliveryBadge instant={product.instant} />
        <p className="text-[15px] font-black text-text">
          {product.priceToman === null ? "—" : product.priceToman.toLocaleString("fa-IR")}
          <span className="mr-1 text-[11px] font-bold text-text-dim">تومان</span>
        </p>
      </div>
    </Link>
  );
}

/** Uploaded artwork when there is one, otherwise a generated Steam card showing the dollar amount. */
export function ProductVisual({ product, large = false }: { product: ShopListProduct; large?: boolean }) {
  if (!product.imageUrl) {
    return <GiftCardVisual usd={product.priceUsdCents / 100} large={large} className={large ? "shadow-[0_30px_80px_rgba(0,0,0,0.6)]" : undefined} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt={product.imageAlt || product.title}
      loading={large ? "eager" : "lazy"}
      className="aspect-[1.6] w-full rounded-[10px] bg-surface object-contain"
    />
  );
}

function DeliveryBadge({ instant }: { instant: boolean }) {
  if (instant) {
    return (
      <span className="flex items-center gap-1 rounded-[20px] bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
        <Zap size={12} />
        تحویل آنی
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-[20px] bg-[#f59e0b]/[0.13] px-2.5 py-1 text-[11px] font-bold text-[#f59e0b]">
      <Clock size={12} />
      تحویل در ساعات کاری
    </span>
  );
}
