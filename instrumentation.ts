export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { warmStaticAssets } = await import("@/app/lib/warmAssets");
  // Not awaited: register() blocks the server from accepting requests, and
  // the warm-up is a nice-to-have that runs quietly in the background.
  setTimeout(() => void warmStaticAssets(), 5_000);

  // User-market deadlines (unpaid reservations, late sellers, silent buyers)
  // must fire even when nobody is browsing the market.
  const { processMarketTimeouts } = await import("@/app/lib/marketOrders");
  setInterval(() => {
    processMarketTimeouts({ force: true }).catch((error) => console.error("[market] timeout sweep failed", error));
  }, 5 * 60_000);
}
