import { existsSync } from "node:fs";
import { join } from "node:path";

/** 브라우저·서버 공용 정적 직인 경로 (public/brand/thinkad-stamp.png) */
export const QUOTE_STAMP_PUBLIC_PATH = "/brand/thinkad-stamp.png";

/** 싱커드 공식 직인 (Bunny CDN, NFD 파일명) */
export const QUOTE_STAMP_CDN_URL =
  "https://tkad-cdn.b-cdn.net/tkad/admin/2026/06/%5B%E1%84%89%E1%85%B5%E1%86%BC%E1%84%8F%E1%85%A5%E1%84%83%E1%85%B3%5D%20%E1%84%83%E1%85%A9%E1%84%8C%E1%85%A1%E1%86%BC.png";

function localStampExists(): boolean {
  return existsSync(join(process.cwd(), "public", "brand", "thinkad-stamp.png"));
}

/** 견적서·PDF·PPTX에 쓸 직인 URL (환경변수 > 로컬 정적 > CDN) */
export function getQuoteStampUrl(): string {
  const fromEnv = process.env.QUOTE_STAMP_URL?.trim();
  if (fromEnv) return fromEnv;
  if (localStampExists()) return QUOTE_STAMP_PUBLIC_PATH;
  return QUOTE_STAMP_CDN_URL;
}

/** html2canvas·미리보기용 src (same-origin 정적은 프록시 생략) */
export function getQuoteStampProxySrc(): string {
  const url = getQuoteStampUrl();
  if (url.startsWith("/")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
