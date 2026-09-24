"use client";

import { useEffect } from "react";

import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, UTM_KEYS } from "@/app/lib/attribution";

function readCookie(): Record<string, string> | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice(ATTRIBUTION_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

/**
 * Remembers where a visitor came from (UTM params + external referrer) so
 * /api/auth/signup can store it on the new user. A link carrying UTM params
 * always wins; otherwise the first external referrer is kept.
 */
export function AttributionTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }

    let referrer = "";
    try {
      if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer;
    } catch {}

    const existing = readCookie();
    const hasUtm = Object.keys(utm).length > 0;
    const existingHasSource = !!existing && (!!existing.utm_source || !!existing.referrer);
    if (!hasUtm && existing && (existingHasSource || !referrer)) return;

    const value = { ...utm, referrer, landing: window.location.pathname + window.location.search };
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${ATTRIBUTION_MAX_AGE}; samesite=lax`;
  }, []);

  return null;
}
