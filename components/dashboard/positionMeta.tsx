import { Swords, Flame, Shield, Crosshair, Heart, type LucideIcon } from "lucide-react";

export const POSITIONS = ["POS1", "POS2", "POS3", "POS4", "POS5"] as const;
export type PositionValue = (typeof POSITIONS)[number];

export const POSITION_ICON: Record<string, LucideIcon> = {
  "POS1": Swords,
  "POS2": Flame,
  "POS3": Shield,
  "POS4": Crosshair,
  "POS5": Heart,
  "Pos 1 - Carry": Swords,
  "Pos 2 - Mid": Flame,
  "Pos 3 - Offlane": Shield,
  "Pos 4 - Soft Support": Crosshair,
  "Pos 5 - Hard Support": Heart,
};

export const POSITION_LABEL: Record<PositionValue, string> = {
  POS1: "Pos 1 - Carry",
  POS2: "Pos 2 - Mid",
  POS3: "Pos 3 - Offlane",
  POS4: "Pos 4 - Soft Support",
  POS5: "Pos 5 - Hard Support",
};

export const POSITION_LABEL_FA: Record<PositionValue, string> = {
  POS1: "کری",
  POS2: "مید",
  POS3: "آفلین",
  POS4: "ساپورت نرم",
  POS5: "ساپورت سخت",
};
