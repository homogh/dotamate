import { NextRequest, NextResponse } from "next/server";

import { contentTypeFor, getCachedImage, isCdnSource, originUrlFor, resolveCachePath } from "@/app/lib/imageCache";

// Serves Valve-hosted images (hero/item art, Steam avatars) from our own disk
// cache — see app/lib/cdnUrls.ts. The files never change under the same URL,
// so browsers can keep them for a long time.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ source: string; path: string[] }> }) {
  const { source, path: segments } = await params;
  const relPath = segments.join("/");

  const fullPath = isCdnSource(source) ? resolveCachePath(source, relPath) : null;
  if (!isCdnSource(source) || !fullPath) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes = await getCachedImage(source, relPath, fullPath);
  if (!bytes) {
    // Couldn't reach the origin either — let the browser try it directly
    // rather than showing a broken image.
    return NextResponse.redirect(originUrlFor(source, relPath), 302);
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(relPath),
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=604800",
    },
  });
}
