import { NextResponse } from "next/server";
import { fetchTrustBadgeContext } from "@/lib/media-trust-catalog";

/**
 * 인기문의/급상승 뱃지 — 전역 데이터(방문자별로 다르지 않음), CDN cache 1h.
 * `/media/[slug]`가 이 데이터를 직접 fetch(enrichMediaWithTrust)하면 그 페이지의
 * unstable_cache 호출이 페이지 자체의 revalidate(604800)를 3600으로 끌어내린다
 * (see reports/isr-writes-root-cause-20260907.md). 클라이언트가 이 엔드포인트를
 * 한 번 fetch해서 로컬에서 id membership을 체크하는 방식으로 분리 — 데이터가
 * 전역이라 모든 상세 페이지가 같은 CDN 캐시 엔트리를 공유한다(방문량과 무관하게
 * origin은 시간당 1회만 실행).
 */
export const revalidate = 3600;

export async function GET() {
  const ctx = await fetchTrustBadgeContext();
  return NextResponse.json(
    {
      topInquiryIds: [...ctx.topInquiryIds],
      hotWeekIds: [...ctx.hotWeekIds],
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } },
  );
}
