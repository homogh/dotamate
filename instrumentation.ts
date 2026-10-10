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

  // Day 1/3/7 emails for users who never finished onboarding. Opt-in per env so
  // a dev machine pointed at a copy of the real DB can't mail real users.
  if (process.env.SIGNUP_REMINDERS_ENABLED === "true") {
    const { processSignupReminders } = await import("@/app/lib/signupReminders");
    const sweepReminders = () => processSignupReminders().catch((error) => console.error("[mail] signup reminder sweep failed", error));
    setTimeout(sweepReminders, 60_000);
    setInterval(sweepReminders, 60 * 60_000);
  }
}
