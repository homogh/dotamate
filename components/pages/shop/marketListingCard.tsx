import Link from "next/link";
import { Swords } from "lucide-react";

import type { MarketListingCard as Card } from "@/app/lib/marketCatalog";
import { RARITY_META } from "@/app/lib/shopCategories";
import { cachedAvatarUrl } from "@/app/lib/cdnUrls";

export function MarketListingCard({ listing }: { listing: Card }) {
  const rarity = listing.rarity ? RARITY_META[listing.rarity] : null;

  return (
    <Link
      href={`/shop/market/${listing.id}`}
      className="group flex flex-col gap-4 rounded-[12px] border border-border bg-surface-alt p-4 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/20"
    >
      <MarketItemImage listing={listing} />

      <div className="flex flex-col gap-1.5">
        <h3 className="line-clamp-2 text-right text-[15px] font-black leading-[1.6] text-text" dir="auto">
          {listing.itemName}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {rarity && (
            <span className="rounded-[4px] px-2 py-0.5 font-bold" style={{ color: rarity.color, backgroundColor: `${rarity.color}1f` }} dir="ltr">
              {rarity.label}
            </span>
          )}
          {listing.heroName && (
            <span className="text-text-dim" dir="ltr">
              {listing.heroName}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto flex w-full items-center justify-between">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-dim">
          {listing.sellerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cachedAvatarUrl(listing.sellerAvatar) ?? listing.sellerAvatar} alt="" className="size-5 shrink-0 rounded-full" />
          ) : (
            <span className="size-5 shrink-0 rounded-full bg-surface" />
          )}
          <span className="truncate">{listing.sellerName}</span>
        </span>
        <p className="shrink-0 text-[15px] font-black text-text">
          {listing.priceToman.toLocaleString("fa-IR")}
          <span className="mr-1 text-[11px] font-bold text-text-dim">تومان</span>
        </p>
      </div>
    </Link>
  );
}

export function MarketItemImage({ listing, large = false }: { listing: Pick<Card, "imageUrl" | "itemName" | "rarity">; large?: boolean }) {
  const color = listing.rarity ? RARITY_META[listing.rarity].color : "#3d3cce";
  return (
    <div
      className="flex aspect-[1.6] w-full items-center justify-center overflow-hidden rounded-[10px]"
      style={{ backgroundImage: `radial-gradient(circle at 50% 45%, ${color}40 0%, transparent 70%), linear-gradient(135deg, #1c1e24 0%, #121317 100%)` }}
    >
      {listing.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.imageUrl} alt={listing.itemName} loading={large ? "eager" : "lazy"} className="h-[85%] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" />
      ) : (
        <Swords size={large ? 48 : 32} style={{ color }} />
      )}
    </div>
  );
}
