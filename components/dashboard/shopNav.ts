/**
 * "shop": shown only while the shop is switched on (orders, wallet).
 * "market": shown only while the user market is on too (listings, sales).
 */
export type ShopNeed = "shop" | "market";

export function shopNavVisible(need: ShopNeed | undefined, shopOpen: boolean, marketOpen: boolean) {
  if (!need) return true;
  return need === "market" ? marketOpen : shopOpen;
}
