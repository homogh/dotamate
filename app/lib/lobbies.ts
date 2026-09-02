export interface Lobby {
  id: string;
  author: string;
  rank: string;
  rankTier: string;
  postedAt: string;
  role: string;
  roleValue: string;
  description: string;
  tags: string[];
  filled: number;
  total: number;
  region: string;
  hasVoice: boolean;
}

export const REGION_OPTIONS = ["همه ریجن‌ها", "اروپا غربی", "اروپا شرقی", "روسیه", "دبی"];
export const ROLE_OPTIONS = [
  { label: "همه نقش‌ها (Pos 1-5)", value: "all" },
  { label: "Pos 1 - Carry", value: "Pos 1" },
  { label: "Pos 2 - Mid", value: "Pos 2" },
  { label: "Pos 3 - Offlane", value: "Pos 3" },
  { label: "Pos 4 - Soft Support", value: "Pos 4" },
  { label: "Pos 5 - Hard Support", value: "Pos 5" },
];
export const RANK_OPTIONS = [
  "همه رنک‌ها",
  "Herald",
  "Guardian",
  "Crusader",
  "Archon",
  "Legend",
  "Ancient",
  "Divine",
  "Immortal",
];

export const LOBBIES_PER_PAGE = 6;

export const LOBBIES: Lobby[] = [
  {
    id: "l1",
    author: "سینا (Arise)",
    rank: "Legend ۴",
    rankTier: "Legend",
    postedAt: "۱۲ دقیقه پیش",
    role: "Pos 3 - Offlane",
    roleValue: "Pos 3",
    description:
      "دنبال یک هاردساپورت باسابقه و تانکی آف‌لین برای لابی رنکد رول اروپا می‌گردیم. تیم وویس دیسکورده، لطفاً پلیرهای جدی درخواست بدن.",
    tags: ["دیسکورد فعال", "ریجن: اروپا شرقی", "پوزیشن ۳ و ۵"],
    filled: 3,
    total: 5,
    region: "اروپا شرقی",
    hasVoice: true,
  },
  {
    id: "l2",
    author: "رادمان (Radman)",
    rank: "Divine ۲",
    rankTier: "Divine",
    postedAt: "۲۵ دقیقه پیش",
    role: "Pos 1 - Carry",
    roleValue: "Pos 1",
    description:
      "پارتی رنک آپ به سمت رنک تایتان. فقط بازیکنان بالای ۵۰۰۰ ساعت با وویس دیسکورد بالا بیان. سمی شدن مساوی با کیک تیمی.",
    tags: ["وویس فعال", "ریجن: اروپا غربی", "پوزیشن ۱"],
    filled: 4,
    total: 5,
    region: "اروپا غربی",
    hasVoice: true,
  },
  {
    id: "l3",
    author: "سهراب (S0hrab)",
    rank: "Immortal",
    rankTier: "Immortal",
    postedAt: "۴۰ دقیقه پیش",
    role: "Pos 2 - Mid",
    roleValue: "Pos 2",
    description:
      "برای تست تیم تدارکاتی نیاز به میدلینر داریم. رنک ایمورتال حتما فیکس باشه و مپ کنترل عالی داشته باشه. پلی جدی.",
    tags: ["تیم جدی", "ریجن: اروپا غربی", "پوزیشن ۲"],
    filled: 2,
    total: 5,
    region: "اروپا غربی",
    hasVoice: false,
  },
  {
    id: "l4",
    author: "امیرمحمد",
    rank: "Archon ۵",
    rankTier: "Archon",
    postedAt: "۱ ساعت پیش",
    role: "Pos 4 - Soft Support",
    roleValue: "Pos 4",
    description: "تفریحی و ریلکس پلی میدیم ولی برای برد می‌جنگیم. سمی نباشید و تیمی بازی کنید. ریجن اروپا.",
    tags: ["ریلکس و وین", "دبی و اروپا", "پوزیشن ۴"],
    filled: 1,
    total: 5,
    region: "دبی",
    hasVoice: false,
  },
  {
    id: "l5",
    author: "بردیا (B1)",
    rank: "Ancient ۳",
    rankTier: "Ancient",
    postedAt: "۲ ساعت پیش",
    role: "Pos 3 - Offlane",
    roleValue: "Pos 3",
    description: "پارتی ۳ نفره بازه. هاردساپورت با وویس لطفا بیاد. رنک‌ها هماهنگ باشه تا سریع‌تر مچ پیدا کنیم.",
    tags: ["وویس دیسکورد", "اروپا شرقی", "پوزیشن ۳"],
    filled: 3,
    total: 5,
    region: "اروپا شرقی",
    hasVoice: true,
  },
  {
    id: "l6",
    author: "سپهر (Silent)",
    rank: "Legend ۱",
    rankTier: "Legend",
    postedAt: "۳ ساعت پیش",
    role: "Pos 5 - Hard Support",
    roleValue: "Pos 5",
    description: "بازی‌های شبانه منظم. برای صعود و مچ‌آپ‌های طولانی مدت نیاز به یک کری ثابت داریم. لابی تا چند دقیقه دیگه استارت میشه.",
    tags: ["پارتی شبانه", "اروپا شرقی", "پوزیشن ۵"],
    filled: 4,
    total: 5,
    region: "اروپا شرقی",
    hasVoice: false,
  },
  {
    id: "l7",
    author: "کیانا (Kiana)",
    rank: "Divine ۵",
    rankTier: "Divine",
    postedAt: "۴ ساعت پیش",
    role: "Pos 2 - Mid",
    roleValue: "Pos 2",
    description: "دنبال یه تیم فیکس برای بازی‌های هفتگی. اگه رول‌کال جدی داری و می‌تونی هر هفته پابند باشی بیا.",
    tags: ["تیم فیکس هفتگی", "روسیه", "پوزیشن ۲"],
    filled: 2,
    total: 5,
    region: "روسیه",
    hasVoice: true,
  },
  {
    id: "l8",
    author: "علی (Alone)",
    rank: "Crusader ۲",
    rankTier: "Crusader",
    postedAt: "۵ ساعت پیش",
    role: "Pos 1 - Carry",
    roleValue: "Pos 1",
    description: "تازه‌کارم و دنبال یه تیم صبور برای یادگیریم. اگه حوصله راهنمایی دارید خوشحال میشم باهاتون بازی کنم.",
    tags: ["مبتدی‌پسند", "اروپا غربی", "پوزیشن ۱"],
    filled: 1,
    total: 5,
    region: "اروپا غربی",
    hasVoice: false,
  },
  {
    id: "l9",
    author: "نیما (Nim)",
    rank: "Ancient ۱",
    rankTier: "Ancient",
    postedAt: "۶ ساعت پیش",
    role: "Pos 4 - Soft Support",
    roleValue: "Pos 4",
    description: "پارتی درفت رنکد رول. هماهنگی پیک از قبل تو چت انجام میشه، لطفاً حاضرجواب باشید تا فرصت رو از دست ندیم.",
    tags: ["درفت هماهنگ", "اروپا شرقی", "پوزیشن ۴"],
    filled: 3,
    total: 5,
    region: "اروپا شرقی",
    hasVoice: true,
  },
  {
    id: "l10",
    author: "مانی (M4ni)",
    rank: "Guardian ۴",
    rankTier: "Guardian",
    postedAt: "۷ ساعت پیش",
    role: "Pos 5 - Hard Support",
    roleValue: "Pos 5",
    description: "چند نفریم و یه نفر کم داریم. جو تیم شوخ و بی‌دعواست، فقط بلد باش وارد بذاری کافیه.",
    tags: ["جو شاد", "دبی و اروپا", "پوزیشن ۵"],
    filled: 4,
    total: 5,
    region: "دبی",
    hasVoice: false,
  },
  {
    id: "l11",
    author: "پویا (Poya)",
    rank: "Herald ۵",
    rankTier: "Herald",
    postedAt: "۸ ساعت پیش",
    role: "Pos 3 - Offlane",
    roleValue: "Pos 3",
    description: "چهار نفریم، دنبال آفلاین آخر تیم برای صعود از رنک هرالد. صبور و بدون فحاشی باشید لطفاً.",
    tags: ["صعود از هرالد", "روسیه", "پوزیشن ۳"],
    filled: 4,
    total: 5,
    region: "روسیه",
    hasVoice: true,
  },
  {
    id: "l12",
    author: "یاسین (Yasin)",
    rank: "Immortal",
    rankTier: "Immortal",
    postedAt: "۹ ساعت پیش",
    role: "Pos 1 - Carry",
    roleValue: "Pos 1",
    description: "استک تمرینی برای تورنومنت داخلی دوتامیت. نیاز به کری با هیرو پول گسترده و مکانیک بالا داریم.",
    tags: ["تمرین تورنومنت", "اروپا غربی", "پوزیشن ۱"],
    filled: 3,
    total: 5,
    region: "اروپا غربی",
    hasVoice: true,
  },
];

export function getPagedLobbies(
  page: number,
  filters: { query: string; region: string; role: string; rank: string; voiceOnly: boolean }
) {
  const q = filters.query.trim().toLowerCase();

  const filtered = LOBBIES.filter((l) => {
    if (filters.voiceOnly && !l.hasVoice) return false;
    if (filters.region !== "همه ریجن‌ها" && l.region !== filters.region) return false;
    if (filters.role !== "all" && l.roleValue !== filters.role) return false;
    if (filters.rank !== "همه رنک‌ها" && l.rankTier !== filters.rank) return false;
    if (q && !`${l.author} ${l.description}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOBBIES_PER_PAGE));
  const start = (page - 1) * LOBBIES_PER_PAGE;
  return { lobbies: filtered.slice(start, start + LOBBIES_PER_PAGE), totalPages };
}
