/**
 * True while this tab is on screen and focused — the user is actually looking
 * at it. Alt-tabbing away or switching browser tabs makes it false. Client-only.
 */
export function isPageWatched() {
  return document.visibilityState === "visible" && document.hasFocus();
}
