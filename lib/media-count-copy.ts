/** DB 미연결·count 0일 때만 사용하는 보수적 폴백 (2026-07 기준 verified active). */
export const MEDIA_COUNT_LABEL_FALLBACK = "660+";

export const MEDIA_COUNT_PLACEHOLDER = "{count}";

/** 내림 10단위 + "+" (예: 527 → "520+", 8 → "8") */
export function formatTrustCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 10) return String(Math.floor(n));
  return `${Math.floor(n / 10) * 10}+`;
}

/**
 * countLabel 은 시그니처 호환을 위해 남겨두되 카피에는 더 이상 넣지 않는다 —
 * "전국 {N} 매체" 처럼 총량을 단정하는 문구는 해외 매체가 섞인 카탈로그
 * 실태와 안 맞는다 (v10 Task H). 대신 매체 유형으로 커버리지를 설명한다.
 */
export function homePageMetadataTitle(locale: string, countLabel: string): string {
  void countLabel;
  return locale === "ko"
    ? `전광판·지하철·버스 옥외광고 단가 비교 | OOH·디지털 매체 한눈에`
    : `Billboard, subway & bus OOH pricing | OOH & digital media, compared`;
}

export function homePageSrOnlyH1(locale: string, countLabel: string): string {
  void countLabel;
  return locale === "ko"
    ? `전광판·지하철·버스 옥외광고 단가 비교 — OOH·디지털 매체 한눈에`
    : `Billboard, subway & bus OOH pricing — compare OOH and digital media`;
}

export function mediaListingMetadataDescription(
  locale: string,
  countLabel: string,
): string {
  void countLabel;
  return locale === "ko"
    ? `전광판·지하철·버스·DOOH 등 검증 매체를 월 단가·지역·유형별로 비교하고 즉시 견적하세요. THINKAD 싱커드.`
    : `Compare verified billboards, subway, bus, and DOOH media by monthly rate, region, and format — get instant quotes on THINKAD.`;
}

export function injectMediaCountPlaceholder(
  text: string,
  countLabel: string,
): string {
  return text.replaceAll(MEDIA_COUNT_PLACEHOLDER, countLabel);
}
