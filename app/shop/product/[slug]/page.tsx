import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, Check, ChevronLeft, Clock, Repeat, ShieldCheck, Zap } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getShopProductPage, getViewerSession } from "@/app/lib/shopCatalog";
import { categoryForType, productHref, RARITY_META } from "@/app/lib/shopCategories";
import { isWithinWorkHours } from "@/app/lib/shopPricing";
import { getWalletBalance } from "@/app/lib/wallet";
import { Card } from "@/components/general/card";
import { BuyBox } from "@/components/pages/shop/buyBox";
import { ProductCard, ProductVisual } from "@/components/pages/shop/productCard";
import { ProductDescription } from "@/components/pages/shop/productDescription";

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// generateMetadata and the page both need the product — fetch it once per request.
const loadProduct = cache(async (slug: string) => getShopProductPage(safeDecode(slug)));

/** Persian slugs can arrive percent-encoded or already decoded depending on the request; accept both. */
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const GUIDES = {
  GIFT_CARD: {
    steps: [
      "روش پرداخت را انتخاب کن و مبلغ را از میت کیف یا درگاه بانکی بپرداز.",
      "کد گیفت کارت در صفحه سفارش نمایش داده می‌شود؛ اگر کد آماده نباشد در ساعات کاری فعال می‌شود و اعلان می‌گیری.",
      "در استیم به Account details → Add funds → Redeem a Steam Gift Card or Wallet Code برو و کد را وارد کن.",
    ],
    faq: [
      { q: "کد را کجا وارد کنم؟", a: "در سایت یا اپ استیم، از منوی حساب کاربری گزینه Redeem a Steam Gift Card or Wallet Code را بزن و کد را وارد کن تا مبلغ به کیف پول استیمت اضافه شود." },
      { q: "اگر ارز کیف پول استیم من دلار نباشد چه می‌شود؟", a: "مبلغ هنگام فعال‌سازی به ارز کیف پول حسابت تبدیل می‌شود." },
      { q: "اگر کد تحویل داده نشود چه می‌شود؟", a: "اگر سفارش به هر دلیلی تحویل نشود، کل مبلغ به میت کیف تو برمی‌گردد." },
    ],
  },
  ITEM: {
    steps: [
      "Trade URL استیمت را در تنظیمات حساب، بخش اتصال استیم، ثبت کن.",
      "مبلغ را از میت کیف یا درگاه بانکی بپرداز.",
      "آیتم با ترید استیم برایت ارسال می‌شود؛ پیشنهاد ترید را در استیم قبول کن.",
    ],
    faq: [
      { q: "آیتم چطور به دستم می‌رسد؟", a: "آیتم از طریق پیشنهاد ترید (Trade Offer) به Trade URL ثبت‌شده در حسابت ارسال می‌شود و کافی است آن را در استیم قبول کنی." },
      { q: "Trade URL را از کجا پیدا کنم؟", a: "در استیم به Inventory → Trade Offers → Who can send me Trade Offers? برو؛ لینک Trade URL پایین همان صفحه است." },
      { q: "اگر آیتم ارسال نشود چه می‌شود؟", a: "اگر سفارش به هر دلیلی تحویل نشود، کل مبلغ به میت کیف تو برمی‌گردد." },
    ],
  },
};

export async function generateMetadata({ params }: PageProps<"/shop/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) return {};

  const { raw } = data;
  const title = raw.metaTitle || `خرید ${raw.title} | فروشگاه دوتامیت`;
  const description = raw.metaDescription || raw.shortDescription || raw.description?.replace(/\s+/g, " ").slice(0, 160) || undefined;
  const url = productHref(raw);
  const images = raw.imageUrl ? [{ url: raw.imageUrl, alt: raw.imageAlt || raw.title }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
  };
}

export default async function ShopProductPage({ params }: PageProps<"/shop/product/[slug]">) {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) notFound();

  const { raw, product, settings, similar } = data;
  const viewer = await getViewerSession();
  const [wallet, user] = viewer
    ? await Promise.all([getWalletBalance(viewer.id), prisma.user.findUnique({ where: { id: viewer.id }, select: { steamTradeUrl: true } })])
    : [null, null];

  const isGift = product.type === "GIFT_CARD";
  const category = categoryForType(product.type);
  const guide = GUIDES[product.type];
  const features = (raw.features ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
  const rarity = product.rarity ? RARITY_META[product.rarity] : null;
  const start = settings.workStartHour.toLocaleString("fa-IR");
  const end = settings.workEndHour.toLocaleString("fa-IR");
  const url = `${SITE_URL}${productHref(raw)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: raw.title,
      description: raw.shortDescription || raw.description || undefined,
      image: raw.imageUrl ? [raw.imageUrl.startsWith("http") ? raw.imageUrl : `${SITE_URL}${raw.imageUrl}`] : undefined,
      sku: `DM-${raw.id}`,
      brand: { "@type": "Brand", name: isGift ? "Steam" : "Dota 2" },
      category: category.title,
      offers:
        product.priceToman === null
          ? undefined
          : {
              "@type": "Offer",
              url,
              // Schema.org expects ISO 4217 — the Rial is IRR, and 1 Toman = 10 Rial.
              priceCurrency: "IRR",
              price: product.priceToman * 10,
              availability: product.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              seller: { "@type": "Organization", name: "دوتامیت" },
            },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "فروشگاه", item: `${SITE_URL}/shop` },
        { "@type": "ListItem", position: 2, name: category.title, item: `${SITE_URL}/shop/${category.key}` },
        { "@type": "ListItem", position: 3, name: raw.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="flex w-full justify-center px-6 py-12 md:px-[100px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex w-full max-w-[1200px] flex-col gap-10">
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-dim" aria-label="مسیر">
          <Link href="/shop" className="hover:text-text">
            فروشگاه
          </Link>
          <ChevronLeft size={14} />
          <Link href={`/shop/${category.key}`} className="hover:text-text">
            {category.title}
          </Link>
          <ChevronLeft size={14} />
          <span className="text-text">{raw.title}</span>
        </nav>

        <div className="grid w-full gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ProductVisual product={product} large />
            {features.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 rounded-[8px] bg-surface-alt px-3 py-2.5 text-[13px] text-text-dim">
                    <Check size={15} className="mt-0.5 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-[28px] font-black leading-[1.5] text-text">{raw.title}</h1>
              {(rarity || product.heroName) && (
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  {rarity && (
                    <span className="rounded-[4px] px-2.5 py-1 font-bold" style={{ color: rarity.color, backgroundColor: `${rarity.color}1f` }} dir="ltr">
                      {rarity.label}
                    </span>
                  )}
                  {product.heroName && <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-text-dim">هیرو: {product.heroName}</span>}
                </div>
              )}
              {raw.shortDescription && <p className="text-[14px] leading-[1.9] text-text-dim">{raw.shortDescription}</p>}
            </div>

            <p className="text-[32px] font-black text-text">
              {product.priceToman === null ? "—" : product.priceToman.toLocaleString("fa-IR")}
              <span className="mr-2 text-[15px] font-bold text-text-dim">تومان</span>
            </p>

            {isGift ? (
              product.instant ? (
                <InfoRow icon={Zap} tone="success" text="کد آماده است؛ بلافاصله بعد از پرداخت در صفحه سفارش تحویل می‌گیری." />
              ) : (
                <InfoRow
                  icon={Clock}
                  tone="warning"
                  text={`موجودی آنی این گیفت کارت تمام شده است. بعد از پرداخت، کد شما در ساعات کاری (${start} تا ${end}) توسط ادمین فعال می‌شود.${
                    isWithinWorkHours(settings) ? "" : ` الان خارج از ساعت کاری است؛ کد از ساعت ${start} فعال می‌شود.`
                  }`}
                />
              )
            ) : (
              <InfoRow icon={Repeat} tone="neutral" text="بعد از پرداخت، آیتم با ترید استیم به Trade URL ثبت‌شده در حسابت ارسال می‌شود." />
            )}

            <BuyBox
              checkoutEndpoint="/api/shop/orders"
              checkoutPayload={{ productId: product.id }}
              productPath={productHref(raw)}
              priceToman={product.priceToman}
              isLoggedIn={Boolean(viewer)}
              walletBalance={wallet?.total ?? 0}
              needsTradeUrl={!isGift && !user?.steamTradeUrl}
              soldOut={product.soldOut}
            />

            <InfoRow icon={ShieldCheck} tone="neutral" text="اگر سفارشت به هر دلیلی تحویل نشود، کل مبلغ به میت کیف تو برمی‌گردد." />
          </div>
        </div>

        <div className="grid w-full gap-6 lg:grid-cols-[1fr_380px]">
          <Card tone="surface" noHover className="w-full gap-4 p-6 md:p-8">
            <h2 className="text-[20px] font-black text-text">درباره محصول</h2>
            {raw.description ? (
              <ProductDescription text={raw.description} />
            ) : (
              <p className="text-[14px] leading-[1.9] text-text-dim">{raw.shortDescription ?? "توضیحاتی برای این محصول ثبت نشده."}</p>
            )}
          </Card>

          <div className="flex flex-col gap-6">
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <h2 className="text-[17px] font-black text-text">مراحل خرید و تحویل</h2>
              <ol className="flex flex-col gap-3">
                {guide.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-[13px] leading-[1.8] text-text-dim">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-black text-white">
                      {(i + 1).toLocaleString("fa-IR")}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>

            <Card tone="surface" noHover className="w-full gap-3 p-6">
              <h2 className="text-[17px] font-black text-text">سوالات متداول</h2>
              {guide.faq.map((f) => (
                <details key={f.q} className="group w-full rounded-[8px] bg-surface-alt px-4 py-3">
                  <summary className="cursor-pointer list-none text-[13px] font-bold text-text marker:hidden">{f.q}</summary>
                  <p className="pt-2 text-[13px] leading-[1.8] text-text-dim">{f.a}</p>
                </details>
              ))}
            </Card>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="flex w-full flex-col gap-6">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-[22px] font-black text-text">محصولات مشابه</h2>
              <Link href={`/shop/${category.key}`} className="flex items-center gap-1.5 text-[13px] font-bold text-accent hover:underline">
                مشاهده همه {category.title}
                <ArrowLeft size={15} />
              </Link>
            </div>
            <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const TONES = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-[#f59e0b]/60 bg-[#f59e0b]/[0.13] text-[#f59e0b]",
  neutral: "border-border bg-surface-alt text-text-dim",
};

function InfoRow({ icon: Icon, text, tone }: { icon: typeof Zap; text: string; tone: keyof typeof TONES }) {
  return (
    <div className={`flex w-full items-start gap-3 rounded-[10px] border px-4 py-3 ${TONES[tone]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-[13px] leading-[1.8]">{text}</p>
    </div>
  );
}
