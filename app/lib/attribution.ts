/** Cookie the client-side tracker writes on landing and signup reads back. */
export const ATTRIBUTION_COOKIE = "dm_attribution";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30;

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Parses the raw cookie value — anything malformed yields all-null so signup never fails on it. */
export function parseAttributionCookie(raw: string | undefined): Attribution {
  let obj: Record<string, unknown> = {};
  try {
    obj = raw ? JSON.parse(decodeURIComponent(raw)) : {};
  } catch {
    obj = {};
  }

  return {
    utmSource: clip(obj.utm_source, 100),
    utmMedium: clip(obj.utm_medium, 100),
    utmCampaign: clip(obj.utm_campaign, 150),
    utmTerm: clip(obj.utm_term, 150),
    utmContent: clip(obj.utm_content, 150),
    referrer: clip(obj.referrer, 500),
    landingPage: clip(obj.landing, 500),
  };
}

/** Short human label for the admin table: utm_source first, then the referrer's host, else direct. */
export function attributionLabel(a: Pick<Attribution, "utmSource" | "utmMedium" | "referrer">) {
  if (a.utmSource) return a.utmMedium ? `${a.utmSource} / ${a.utmMedium}` : a.utmSource;
  if (a.referrer) {
    try {
      return new URL(a.referrer).hostname.replace(/^www\./, "");
    } catch {
      return a.referrer;
    }
  }
  return "مستقیم";
}
