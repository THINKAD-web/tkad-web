import { NextRequest, NextResponse } from "next/server";
import { buildBunnyCdnUrl, isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { decodeBunnyPathSegments } from "@/lib/optimized-image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

const IMAGE_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

function bunnyStorageBaseUrl(): string {
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";
  return host.replace(/\/+$/, "");
}

/**
 * App Router `[...path]` 세그먼트 → 스토리지 object path.
 * `buildBunnyMediaProxyUrl`이 넣는 단일 percent-encoding을 디코딩해
 * 유니코드 키로 맞춘다 (이미 디코딩된 세그먼트는 decodeBunnyPathSegments가 보존).
 */
function normalizeObjectPath(segments: string[]): string | null {
  const parts = decodeBunnyPathSegments(segments);
  const path = parts.join("/");
  if (!path || path.includes("..")) return null;
  return path;
}

async function imageResponseFromUpstream(
  upstream: Response,
): Promise<NextResponse> {
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Not an image", { status: 415 });
  }

  const ab = await upstream.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    return new NextResponse("Too large", { status: 413 });
  }

  return new NextResponse(new Uint8Array(ab), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": IMAGE_CACHE_CONTROL,
    },
  });
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!isBunnyStorageConfigured()) {
    return new NextResponse("Bunny storage not configured", { status: 503 });
  }

  const { path: segments } = await ctx.params;
  const objectPath = normalizeObjectPath(segments);
  if (!objectPath) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const zone = process.env.BUNNY_STORAGE_ZONE!.trim();
  const key = process.env.BUNNY_STORAGE_API_KEY!.trim();
  const storageUrl = `${bunnyStorageBaseUrl()}/${encodeURIComponent(zone)}/${objectPath}`;

  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(storageUrl, {
      headers: { AccessKey: key },
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Storage fetch failed: ${msg}`, { status: 502 });
  }

  if (upstream.ok) {
    return imageResponseFromUpstream(upstream);
  }

  if (upstream.status !== 404) {
    return new NextResponse(`Storage ${upstream.status}`, { status: 502 });
  }

  const cdnUrl = buildBunnyCdnUrl(objectPath);
  if (!cdnUrl) {
    return new NextResponse("Storage 404", { status: 404 });
  }

  let cdnRes: Response;
  try {
    cdnRes = await fetchWithTimeout(cdnUrl, { cache: "no-store" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`CDN fetch failed: ${msg}`, { status: 502 });
  }

  if (!cdnRes.ok) {
    return new NextResponse(`CDN ${cdnRes.status}`, {
      status: cdnRes.status === 404 ? 404 : 502,
    });
  }

  return imageResponseFromUpstream(cdnRes);
}
