// OpenDota's own numeric game_mode — distinct from the app's GAME_MODE_LABEL,
// which is keyed by the LFG post enum instead.
export const OPENDOTA_GAME_MODE_LABEL: Record<number, string> = {
  1: "All Pick",
  2: "Captains Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  16: "Captains Draft",
  22: "Ranked All Pick",
  23: "Turbo",
};

export function faNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

/** 2534 → "۴۲:۱۴" */
export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${faNumber(minutes)}:${String(seconds % 60).padStart(2, "0").replace(/\d/g, (d) => faNumber(Number(d)))}`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${faNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${faNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${faNumber(days)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

/** (k + a) / d, the way Dota shows it — deaths of 0 count as 1. */
export function kdaRatio(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(deaths, 1);
}
