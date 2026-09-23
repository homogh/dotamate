import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";

import { CDN_SOURCES, type CdnSource } from "@/app/lib/cdnUrls";

// Disk cache behind the /cdn/[source]/[...path] route. Lives under /storage
// (not /public) because files added to /public after `next build` aren't served.
export const IMAGE_CACHE_ROOT = path.join(process.cwd(), "storage", "cdn-cache");

// Valve occasionally re-exports art on a patch; the warm-up re-downloads
// anything older than this so the local copy doesn't drift forever.
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;
const WARM_CONCURRENCY = 4;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function isCdnSource(source: string): source is CdnSource {
  return source in CDN_SOURCES;
}

export function contentTypeFor(relPath: string) {
  // Steam economy icons have no extension in their URL; they're always PNG.
  if (relPath.startsWith("economy/image/")) return "image/png";
  return CONTENT_TYPES[path.extname(relPath).toLowerCase()] ?? "application/octet-stream";
}

export function originUrlFor(source: CdnSource, relPath: string) {
  return `${CDN_SOURCES[source].origin}/${relPath}`;
}

/** null = not something we're willing to proxy (keeps /cdn from being an open proxy). */
export function resolveCachePath(source: CdnSource, relPath: string) {
  if (!CDN_SOURCES[source].pattern.test(relPath) || relPath.includes("..")) return null;
  return path.join(IMAGE_CACHE_ROOT, source, relPath);
}

// One download per file even when many requests (or the warm-up) miss at once.
const inFlight = new Map<string, Promise<Buffer | null>>();

async function download(source: CdnSource, relPath: string, fullPath: string): Promise<Buffer | null> {
  try {
    const res = await fetch(originUrlFor(source, relPath), {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(path.dirname(fullPath), { recursive: true });
    // Write-then-rename so a request never streams a half-written file.
    const tmpPath = `${fullPath}.${process.pid}.tmp`;
    await writeFile(tmpPath, bytes);
    await rename(tmpPath, fullPath);
    return bytes;
  } catch {
    return null;
  }
}

function downloadOnce(source: CdnSource, relPath: string, fullPath: string) {
  const pending = inFlight.get(fullPath);
  if (pending) return pending;

  const job = download(source, relPath, fullPath).finally(() => inFlight.delete(fullPath));
  inFlight.set(fullPath, job);
  return job;
}

/** Cached bytes, downloading on a miss. null = origin unreachable too. */
export async function getCachedImage(source: CdnSource, relPath: string, fullPath: string): Promise<Buffer | null> {
  const cached = await readFile(fullPath).catch(() => null);
  if (cached) return cached;
  return downloadOnce(source, relPath, fullPath);
}

async function warmOne(source: CdnSource, relPath: string) {
  const fullPath = resolveCachePath(source, relPath);
  if (!fullPath) return;

  const fileStat = await stat(fullPath).catch(() => null);
  if (fileStat && Date.now() - fileStat.mtimeMs < REFRESH_AFTER_MS) return;

  await downloadOnce(source, relPath, fullPath);
}

/**
 * Downloads every given /cdn/* URL that isn't on disk yet. Deliberately
 * slow-and-steady (a few at a time, in the background) so it never competes
 * with real page requests.
 */
export async function warmImageCache(localUrls: string[]) {
  const queue = [...new Set(localUrls)]
    .map((url) => url.match(/^\/cdn\/(\w+)\/(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null && isCdnSource(m[1]))
    .map((m) => ({ source: m[1] as CdnSource, relPath: m[2] }));

  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      await warmOne(job.source, job.relPath);
    }
  };
  await Promise.all(Array.from({ length: WARM_CONCURRENCY }, worker));
}
