import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side image proxy — 외부 http(s) 이미지를 same-origin 으로 중계해
 * html2canvas / 캔버스 캡처 시 CORS 오염을 회피한다.
 *
 * 보호:
 *   - 허용 프로토콜: http, https 만
 *   - 허용 호스트: 환경변수 `IMAGE_PROXY_ALLOWED_HOSTS` (쉼표 구분, suffix 매칭)
 *     기본값: 주요 CDN (cloudinary, cloudfront, amazonaws, gstatic, unsplash, picsum, googleusercontent)
 *   - 최대 15MB, 20초 타임아웃
 *   - 응답은 이미지 MIME 만 통과
 */

const DEFAULT_ALLOWED_HOSTS = [
  "res.cloudinary.com",
  ".cloudinary.com",
  ".cloudfront.net",
  ".amazonaws.com",
  ".s3.amazonaws.com",
  "images.unsplash.com",
  "picsum.photos",
  ".googleusercontent.com",
  "i.imgur.com",
  ".imgur.com",
  "thinkad.kr",
  ".thinkad.kr",
];

const MAX_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

function allowedHosts(): string[] {
  const env = process.env.IMAGE_PROXY_ALLOWED_HOSTS?.trim();
  if (!env) return DEFAULT_ALLOWED_HOSTS;
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

function hostAllowed(hostname: string): boolean {
  const list = allowedHosts();
  const h = hostname.toLowerCase();
  return list.some((pat) => {
    const p = pat.toLowerCase();
    if (p.startsWith(".")) return h === p.slice(1) || h.endsWith(p);
    return h === p;
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse("Unsupported protocol", { status: 400 });
  }
  if (!hostAllowed(target.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "thinkad-image-proxy/1.0" },
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Upstream fetch failed: ${msg}`, { status: 502 });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    return new NextResponse(`Upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Not an image", { status: 415 });
  }

  const lenHeader = upstream.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return new NextResponse("Too large", { status: 413 });
  }

  const ab = await upstream.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    return new NextResponse("Too large", { status: 413 });
  }

  return new NextResponse(new Uint8Array(ab), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
