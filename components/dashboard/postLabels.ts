export const RANK_OPTIONS = [
  { value: "HERALD", label: "Herald" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "CRUSADER", label: "Crusader" },
  { value: "ARCHON", label: "Archon" },
  { value: "LEGEND", label: "Legend" },
  { value: "ANCIENT", label: "Ancient" },
  { value: "DIVINE", label: "Divine" },
  { value: "IMMORTAL", label: "Immortal" },
] as const;

export const REGION_OPTIONS = [
  { value: "EU_WEST", label: "اروپا غربی" },
  { value: "EU_EAST", label: "اروپا شرقی" },
  { value: "RUSSIA", label: "روسیه" },
  { value: "DUBAI", label: "دبی" },
] as const;

export const GAME_MODE_OPTIONS = [
  { value: "RANKED_ALL_PICK", label: "Ranked All Pick" },
  { value: "ALL_PICK", label: "All Pick" },
  { value: "TURBO", label: "Turbo" },
  { value: "CAPTAINS_MODE", label: "Captains Mode" },
] as const;

export const RANK_LABEL: Record<string, string> = {
  UNRANKED: "بدون رنک",
  ...Object.fromEntries(RANK_OPTIONS.map((o) => [o.value, o.label])),
};
export const REGION_LABEL: Record<string, string> = Object.fromEntries(REGION_OPTIONS.map((o) => [o.value, o.label]));
export const GAME_MODE_LABEL: Record<string, string> = Object.fromEntries(
  GAME_MODE_OPTIONS.map((o) => [o.value, o.label]),
);
