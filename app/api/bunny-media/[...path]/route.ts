import { NextRequest, NextResponse } from "next/server";
import { isBunnyStorageConfigured } from "@/lib/bunny-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

function bunnyStorageBaseUrl(): string {
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";
  return host.replace(/\/+$/, "");
}

function normalizeObjectPath(segments: string[]): string | null {
  const path = segments.map((s) => s.trim()).filter(Boolean).join("/");
  if (!path || path.includes("..")) return null;
  return path;
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
  const fetchUrl = `${bunnyStorageBaseUrl()}/${encodeURIComponent(zone)}/${objectPath}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: { AccessKey: key },
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Storage fetch failed: ${msg}`, { status: 502 });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    return new NextResponse(`Storage ${upstream.status}`, {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

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
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
