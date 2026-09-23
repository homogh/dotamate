export type ShopAccess = "open" | "history" | "none";
/**
 * "open": needs the shop switched on (buying).
 * "any": also shown to users with shop history (orders, wallet — their money).
 * "market": needs the user market switched on (selling, market orders).
 */
export type ShopNeed = "open" | "any" | "market";

export function shopNavVisible(need: ShopNeed | undefined, access: ShopAccess, marketOpen: boolean) {
  if (!need) return true;
  if (need === "market") return marketOpen;
  return access === "open" || (need === "any" && access === "history");
}
