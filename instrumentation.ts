export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { warmStaticAssets } = await import("@/app/lib/warmAssets");
  // Not awaited: register() blocks the server from accepting requests, and
  // the warm-up is a nice-to-have that runs quietly in the background.
  setTimeout(() => void warmStaticAssets(), 5_000);

  // Lobby posts auto-expire after 24h (with a warning an hour before).
  const { processPostExpiry } = await import("@/app/lib/postExpiry");
  const sweepPosts = () => processPostExpiry().catch((error) => console.error("[posts] expiry sweep failed", error));
  setTimeout(sweepPosts, 15_000);
  setInterval(sweepPosts, 5 * 60_000);
}
