import { rateLimit } from "@/lib/rate-limit";

/**
 * CDN 장애 시 fallback 폭주 대비.
 * 한 페이지 수십 장 + 몇 탭 정도는 통과시키고, 동일 IP 무한 재시도만 막는다.
 *
 * PDF/서버 임베드는 Storage API를 우선 사용하고 `/api/bunny-media` HTTP는
 * 드물게만 타므로, 이 한도로 정상 서버 배치가 막히지 않도록 넉넉히 둔다.
 */
export const BUNNY_MEDIA_RATE_LIMIT = 300;
export const BUNNY_MEDIA_RATE_WINDOW_MS = 60_000;

const limiter = rateLimit({
  limit: BUNNY_MEDIA_RATE_LIMIT,
  windowMs: BUNNY_MEDIA_RATE_WINDOW_MS,
});

/** @returns true if the request is allowed */
export function allowBunnyMediaRequest(clientKey: string): boolean {
  return limiter.check(`bunny-media:${clientKey}`);
}
