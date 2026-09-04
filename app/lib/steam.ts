const STEAM_ID64_BASE = BigInt("76561197960265728");

export function steamId64ToAccountId(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_ID64_BASE);
}

export function buildSteamLoginUrl(returnTo: string, realm: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

// Verifies a Steam OpenID 2.0 callback and returns the caller's steamid64, or
// null if the response is missing, malformed, or fails Steam's own check.
export async function verifySteamOpenIdCallback(searchParams: URLSearchParams): Promise<string | null> {
  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) return null;

  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) return null;

  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    verifyParams.set(key, value);
  }
  verifyParams.set("openid.mode", "check_authentication");

  const res = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  const text = await res.text();

  if (!text.includes("is_valid:true")) return null;

  return match[1];
}

interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatarfull: string;
  loccountrycode?: string;
  timecreated?: number;
  communityvisibilitystate: number;
}

export async function fetchSteamPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId64}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const player = json?.response?.players?.[0];
  return player ?? null;
}

export async function resolveSteamVanityUrl(vanity: string): Promise<string | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(vanity)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  if (json?.response?.success === 1) return json.response.steamid as string;
  return null;
}

// Accepts a raw steamid64, a /profiles/<id64> URL, an /id/<vanity> URL, or a
// bare vanity name, and resolves it to a steamid64.
export async function resolveSteamInput(input: string): Promise<string | null> {
  const trimmed = input.trim();

  if (/^\d{17}$/.test(trimmed)) return trimmed;

  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (profileMatch) return profileMatch[1];

  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
  const vanity = vanityMatch ? vanityMatch[1] : trimmed.includes("/") ? null : trimmed;
  if (!vanity) return null;

  return resolveSteamVanityUrl(vanity);
}
