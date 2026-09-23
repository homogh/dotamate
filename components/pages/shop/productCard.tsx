import Link from "next/link";
import { Clock, Repeat, Swords, Zap } from "lucide-react";

import type { ShopListProduct } from "@/app/lib/shopCatalog";
import { productHref, RARITY_META } from "@/app/lib/shopCategories";
import { GiftCardVisual } from "@/components/pages/shop/giftCardVisual";

export function ProductCard({ product }: { product: ShopListProduct }) {
  const rarity = product.rarity ? RARITY_META[product.rarity] : null;

  return (
    <Link
      href={productHref(product)}
      className="group flex flex-col gap-4 rounded-[12px] border border-border bg-surface-alt p-4 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/20"
    >
      <ProductVisual product={product} />

      <div className="flex flex-col gap-1.5">
        <h3 className="line-clamp-2 text-right text-[15px] font-black leading-[1.6] text-text" dir="auto">
          {product.title}
        </h3>
        {(product.heroName || rarity) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {rarity && (
              <span className="rounded-[4px] px-2 py-0.5 font-bold" style={{ color: rarity.color, backgroundColor: `${rarity.color}1f` }} dir="ltr">
                {rarity.label}
              </span>
            )}
            {product.heroName && (
              <span className="text-text-dim" dir="auto">
                {product.heroName}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex w-full items-center justify-between">
        <DeliveryBadge product={product} />
        <p className="text-[15px] font-black text-text">
          {product.priceToman === null ? "—" : product.priceToman.toLocaleString("fa-IR")}
          <span className="mr-1 text-[11px] font-bold text-text-dim">تومان</span>
        </p>
      </div>
    </Link>
  );
}

export function ProductVisual({ product, large = false }: { product: ShopListProduct; large?: boolean }) {
  if (product.type === "GIFT_CARD" && !product.imageUrl) {
    return <GiftCardVisual usd={product.priceUsdCents / 100} large={large} className={large ? "shadow-[0_30px_80px_rgba(0,0,0,0.6)]" : undefined} />;
  }
  if (product.imageUrl) {
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
  // Item without artwork: a rarity-tinted tile so the grid never shows dead grey boxes.
  const color = product.rarity ? RARITY_META[product.rarity].color : "#3d3cce";
  return (
    <div
      className="flex aspect-[1.6] w-full flex-col items-center justify-center gap-2 rounded-[10px]"
      style={{ backgroundImage: `radial-gradient(circle at 50% 40%, ${color}40 0%, transparent 70%), linear-gradient(135deg, #1c1e24 0%, #121317 100%)` }}
    >
      <Swords size={large ? 48 : 32} style={{ color }} />
      {product.heroName && (
        <span className={`font-bold text-text-dim ${large ? "text-[15px]" : "text-[12px]"}`} dir="ltr">
          {product.heroName}
        </span>
      )}
    </div>
  );
}

function DeliveryBadge({ product }: { product: ShopListProduct }) {
  if (product.soldOut) {
    return <span className="rounded-[20px] bg-danger/15 px-2.5 py-1 text-[11px] font-bold text-danger">ناموجود</span>;
  }
  if (product.instant) {
    return (
      <span className="flex items-center gap-1 rounded-[20px] bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
        <Zap size={12} />
        تحویل آنی
      </span>
    );
  }
  if (product.type === "ITEM") {
    return (
      <span className="flex items-center gap-1 rounded-[20px] bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-accent">
        <Repeat size={12} />
        ارسال با ترید
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
