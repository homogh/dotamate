// Behavior / communication scores, modelled on Dota 2's own: both start at
// 10,000 and cap at 12,000. Only an admin-confirmed report moves them —
// a submitted report on its own never touches the score.

export const SCORE_MAX = 12000;
export const SCORE_DEFAULT = 10000;

export type ReportCategoryValue = "BEHAVIOR" | "COMMUNICATION";

export type ReportReasonValue =
  | "GRIEFING"
  | "INTENTIONAL_FEEDING"
  | "ABILITY_ABUSE"
  | "AFK_ABANDON"
  | "SMURFING"
  | "CHEATING"
  | "ACCOUNT_BOOSTING"
  | "COMMUNICATION_ABUSE"
  | "CHAT_VOICE_SPAM"
  | "HATE_SPEECH";

export interface ReportReasonMeta {
  value: ReportReasonValue;
  category: ReportCategoryValue;
  label: string;
  hint: string;
  // Default deduction applied on confirmation — the admin can adjust it.
  penalty: number;
}

export const REPORT_REASONS: ReportReasonMeta[] = [
  { value: "GRIEFING", category: "BEHAVIOR", label: "گریف / خرابکاری عمدی", hint: "بازی رو عمداً خراب کرده", penalty: 500 },
  { value: "INTENTIONAL_FEEDING", category: "BEHAVIOR", label: "فید عمدی", hint: "عمداً پشت سر هم مرده", penalty: 500 },
  { value: "ABILITY_ABUSE", category: "BEHAVIOR", label: "سوءاستفاده از اسکیل", hint: "مثلاً بلاک یا هل دادن هم‌تیمی", penalty: 300 },
  { value: "AFK_ABANDON", category: "BEHAVIOR", label: "AFK / ترک بازی", hint: "بازی رو ول کرده یا فارم نکرده", penalty: 400 },
  { value: "SMURFING", category: "BEHAVIOR", label: "اسمورف", hint: "با اکانت فرعی توی رنک پایین‌تر بازی می‌کنه", penalty: 600 },
  { value: "CHEATING", category: "BEHAVIOR", label: "چیت / اسکریپت", hint: "استفاده از نرم‌افزار غیرمجاز", penalty: 1500 },
  { value: "ACCOUNT_BOOSTING", category: "BEHAVIOR", label: "اکانت بوست‌شده / اجاره‌ای", hint: "اکانت مال خودش نیست", penalty: 800 },
  { value: "COMMUNICATION_ABUSE", category: "COMMUNICATION", label: "توهین و فحاشی", hint: "توی چت یا ویس", penalty: 400 },
  { value: "CHAT_VOICE_SPAM", category: "COMMUNICATION", label: "اسپم چت / ویس / پینگ", hint: "مزاحمت با اسپم", penalty: 200 },
  { value: "HATE_SPEECH", category: "COMMUNICATION", label: "تهدید یا توهین قومی/نژادی", hint: "رفتار نفرت‌پراکن", penalty: 800 },
];

export const REPORT_REASON_MAP = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r])) as Record<
  ReportReasonValue,
  ReportReasonMeta
>;

export const REPORT_CATEGORY_LABEL: Record<ReportCategoryValue, string> = {
  BEHAVIOR: "رفتار در بازی",
  COMMUNICATION: "ارتباطات (چت و ویس)",
};

export function clampScore(score: number) {
  return Math.min(SCORE_MAX, Math.max(0, Math.round(score)));
}

export interface ScoreTier {
  label: string;
  tone: "success" | "accent" | "warning" | "danger";
}

export function scoreTier(score: number): ScoreTier {
  if (score >= 10000) return { label: "عالی", tone: "success" };
  if (score >= 8000) return { label: "خوب", tone: "accent" };
  if (score >= 5000) return { label: "متوسط", tone: "warning" };
  return { label: "ضعیف", tone: "danger" };
}

// Evidence limits — enforced on both the modal and the upload route.
export const EVIDENCE_MAX_FILES = 4;
export const EVIDENCE_MAX_VIDEO_SECONDS = 10;
export const EVIDENCE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const EVIDENCE_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const EVIDENCE_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

// Anti-spam, same idea as Dota's limited weekly report count.
export const REPORTS_PER_DAY = 5;

// --- Commends: the way back up --------------------------------------------
// Every COMMENDS_PER_BONUS commends add COMMEND_BONUS to behaviorScore. The
// rest of these exist so a group of friends can't farm someone's score.

export type CommendTypeValue = "FRIENDLY" | "FORGIVING" | "TEACHING" | "LEADERSHIP";

export const COMMEND_TYPES: { value: CommendTypeValue; label: string }[] = [
  { value: "FRIENDLY", label: "رفیق و خوش‌برخورد" },
  { value: "FORGIVING", label: "صبور و باگذشت" },
  { value: "TEACHING", label: "راهنما و آموزش‌دهنده" },
  { value: "LEADERSHIP", label: "لیدر و هماهنگ‌کننده" },
];

export const COMMENDS_PER_BONUS = 15;
export const COMMEND_BONUS = 250;
// Only matches from the last few days can be commended — like Dota's post-game window.
export const COMMEND_MATCH_MAX_AGE_DAYS = 7;
// How many commends one player can hand out per day.
export const COMMENDS_PER_DAY = 5;
// The same player can commend the same teammate once per this many days,
// no matter how many matches they play together (stops duo farming).
export const COMMEND_PAIR_COOLDOWN_DAYS = 7;
// At most one bonus per this window — extra commends wait, they aren't lost.
export const COMMEND_BONUS_COOLDOWN_DAYS = 7;
// A commend only counts if the giver is in good standing themselves.
export const COMMENDER_MIN_BEHAVIOR = 6000;
export const COMMENDER_MIN_ACCOUNT_AGE_DAYS = 3;

export const DAY_MS = 24 * 60 * 60 * 1000;
