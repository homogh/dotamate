// Pure URL mapping for images that originally live on Valve's CDNs. Every
// URL handed to the browser points at our own /cdn/* route instead, which
// serves a copy the server already downloaded — users in Iran never have to
// reach steamstatic.com themselves. No fs imports here: client components
// (UserAvatar, settings) use these helpers too.

export const CDN_SOURCES = {
  // Hero portraits/icons and item images (paths come from OpenDota constants).
  steam: {
    origin: "https://cdn.cloudflare.steamstatic.com",
    pattern: /^apps\/dota2\/[\w\-/]+\.(png|jpg|jpeg|webp)$/i,
  },
  // Steam profile pictures — the file name is the avatar hash, so a changed
  // avatar is always a new URL and cached copies never go stale.
  // Steam economy (inventory/market) item icons: economy/image/<icon hash>/<size>.
  economy: {
    origin: "https://community.cloudflare.steamstatic.com",
    pattern: /^economy\/image\/[\w-]{20,600}\/\d{2,3}fx\d{2,3}f$/,
  },
  avatars: {
    origin: "https://avatars.steamstatic.com",
    pattern: /^[a-f0-9]{40}(_medium|_full)?\.jpg$/i,
  },
} as const;

export type CdnSource = keyof typeof CDN_SOURCES;

/** "/apps/dota2/images/.../axe.png?" → "/cdn/steam/apps/dota2/images/.../axe.png" */
export function steamAssetUrl(assetPath: unknown): string {
  if (!assetPath) return "";
  const clean = String(assetPath).split("?")[0].replace(/^\/+/, "");
  return CDN_SOURCES.steam.pattern.test(clean) ? `/cdn/steam/${clean}` : `${CDN_SOURCES.steam.origin}/${clean}`;
}

/** Any *.steamstatic.com avatar URL → our cached copy; anything else passes through untouched. */
export function cachedAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Covers avatars.steamstatic.com, its akamai/fastly mirrors and the legacy
  // steamcdn-a.akamaihd.net/.../avatars/ab/<hash>_full.jpg form.
  const match = url.match(/^https?:\/\/[\w.-]*(?:steamstatic\.com|akamaihd\.net)\/[\w/]*?([a-f0-9]{40}(?:_medium|_full)?\.jpg)$/i);
  return match ? `/cdn/avatars/${match[1]}` : url;
}

/** Inventory `icon_url` hash → our cached copy of the item icon. */
export function steamEconomyImageUrl(iconHash: string | null | undefined, size = 360): string | null {
  if (!iconHash) return null;
  const path = `economy/image/${iconHash}/${size}fx${size}f`;
  return CDN_SOURCES.economy.pattern.test(path) ? `/cdn/economy/${path}` : null;
}
