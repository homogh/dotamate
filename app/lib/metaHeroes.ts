export type HeroTier = "S" | "A" | "B";

export interface MetaHero {
  name: string;
  tier: HeroTier;
  winRate: number;
  pickRate: number;
}

export interface MetaRole {
  position: string;
  role: string;
  heroes: MetaHero[];
}

export const CURRENT_PATCH = "7.35d";
export const META_UPDATED_AT = "۲۴ اسفند ۱۴۰۴";

export const RANK_FILTERS = [
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

export const POSITION_FILTERS = [
  { label: "همه پوزیشن‌ها", value: "all" },
  { label: "Pos 1", value: "Pos 1 - Carry" },
  { label: "Pos 2", value: "Pos 2 - Mid" },
  { label: "Pos 3", value: "Pos 3 - Offlane" },
  { label: "Pos 4", value: "Pos 4 - Support" },
  { label: "Pos 5", value: "Pos 5 - Hard Support" },
];

export const META_ROLES: MetaRole[] = [
  {
    position: "Pos 1 - Carry",
    role: "کری",
    heroes: [
      { name: "Slark", tier: "S", winRate: 53.8, pickRate: 12.4 },
      { name: "Lifestealer", tier: "S", winRate: 52.9, pickRate: 15.1 },
      { name: "Faceless Void", tier: "A", winRate: 51.5, pickRate: 18.3 },
      { name: "Luna", tier: "B", winRate: 50.8, pickRate: 10.2 },
    ],
  },
  {
    position: "Pos 2 - Mid",
    role: "مید",
    heroes: [
      { name: "Storm Spirit", tier: "S", winRate: 54.2, pickRate: 11.8 },
      { name: "Sniper", tier: "A", winRate: 52.1, pickRate: 22.5 },
      { name: "Leshrac", tier: "A", winRate: 51.9, pickRate: 8.4 },
      { name: "Puck", tier: "B", winRate: 50.2, pickRate: 9.1 },
    ],
  },
  {
    position: "Pos 3 - Offlane",
    role: "آفلین",
    heroes: [
      { name: "Centaur", tier: "S", winRate: 55.1, pickRate: 14.2 },
      { name: "Doom", tier: "S", winRate: 53, pickRate: 9.8 },
      { name: "Dragon Knight", tier: "A", winRate: 51.2, pickRate: 16.5 },
      { name: "Mars", tier: "B", winRate: 49.8, pickRate: 12 },
    ],
  },
  {
    position: "Pos 4 - Support",
    role: "سافت ساپورت",
    heroes: [
      { name: "Hoodwink", tier: "S", winRate: 53.4, pickRate: 19.2 },
      { name: "Tiny", tier: "A", winRate: 52.5, pickRate: 13.4 },
      { name: "Rubick", tier: "B", winRate: 50.1, pickRate: 25.2 },
      { name: "Lion", tier: "B", winRate: 49.2, pickRate: 21 },
    ],
  },
  {
    position: "Pos 5 - Hard Support",
    role: "هارد ساپورت",
    heroes: [
      { name: "Warlock", tier: "S", winRate: 54.8, pickRate: 10.5 },
      { name: "Crystal Maiden", tier: "A", winRate: 52.2, pickRate: 16.8 },
      { name: "Vengeful Spirit", tier: "A", winRate: 51.6, pickRate: 14.3 },
      { name: "Disruptor", tier: "B", winRate: 50.5, pickRate: 11.2 },
    ],
  },
];
