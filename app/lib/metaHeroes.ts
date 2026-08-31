export interface MetaHero {
  name: string;
  winRate: number;
  pickRate: number;
}

export interface MetaRole {
  position: string;
  role: string;
  heroes: MetaHero[];
}

export const CURRENT_PATCH = "۷.۳۸";

export const META_ROLES: MetaRole[] = [
  {
    position: "Pos 1",
    role: "کری",
    heroes: [
      { name: "Terrorblade", winRate: 53.4, pickRate: 18.2 },
      { name: "Spectre", winRate: 52.1, pickRate: 14.6 },
      { name: "Faceless Void", winRate: 51.6, pickRate: 12.9 },
    ],
  },
  {
    position: "Pos 2",
    role: "مید",
    heroes: [
      { name: "Storm Spirit", winRate: 52.8, pickRate: 16.4 },
      { name: "Void Spirit", winRate: 51.9, pickRate: 13.1 },
      { name: "Templar Assassin", winRate: 51.3, pickRate: 11.7 },
    ],
  },
  {
    position: "Pos 3",
    role: "آفلین",
    heroes: [
      { name: "Timbersaw", winRate: 53.9, pickRate: 15.8 },
      { name: "Bristleback", winRate: 52.6, pickRate: 13.4 },
      { name: "Dawnbreaker", winRate: 51.4, pickRate: 12.2 },
    ],
  },
  {
    position: "Pos 4",
    role: "سافت ساپورت",
    heroes: [
      { name: "Snapfire", winRate: 53.2, pickRate: 14.9 },
      { name: "Grimstroke", winRate: 52.4, pickRate: 12.5 },
      { name: "Pudge", winRate: 51.1, pickRate: 17.3 },
    ],
  },
  {
    position: "Pos 5",
    role: "هارد ساپورت",
    heroes: [
      { name: "Warlock", winRate: 53.7, pickRate: 13.6 },
      { name: "Shadow Shaman", winRate: 52.3, pickRate: 11.9 },
      { name: "Vengeful Spirit", winRate: 51.8, pickRate: 10.4 },
    ],
  },
];
