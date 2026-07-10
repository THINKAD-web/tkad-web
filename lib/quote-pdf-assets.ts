import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getQuoteStampUrl, QUOTE_STAMP_PUBLIC_PATH } from "@/lib/quote-stamp";

export { QUOTE_STAMP_PUBLIC_PATH };

function readPublicPngDataUrl(relativePath: string): string | null {
  const p = join(process.cwd(), "public", relativePath.replace(/^\//, ""));
  if (!existsSync(p)) return null;
  try {
    const buf = readFileSync(p);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Optional PNG at public/brand/thinkad-logo.png */
export function loadThinkadLogoDataUrl(): string | null {
  return readPublicPngDataUrl("/brand/thinkad-logo.png");
}

/** 로컬 public/brand/thinkad-stamp.png 만 (동기) */
export function loadQuoteStampDataUrl(): string | null {
  return readPublicPngDataUrl(QUOTE_STAMP_PUBLIC_PATH);
}

/**
 * 견적서·계약서 PDF 공용 직인 — 로컬 파일 → QUOTE_STAMP_URL/CDN 순.
 * 없으면 null (계약서는 (인) 폴백, 견적서는 생략).
 */
export async function resolveQuoteStampDataUrl(
  remoteUrl?: string | null,
): Promise<string | null> {
  const local = loadQuoteStampDataUrl();
  if (local) return local;

  const url = remoteUrl?.trim() || getQuoteStampUrl();
  if (!url || url.startsWith("/")) return null;

  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}
