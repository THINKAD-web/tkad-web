import { mediaPriceExclNoteText } from "@/lib/media-price-format";

/** 플래너 PDF/PPT/웹 푸터 — RFP 견적과 동일 VAT·제작비 고지 */
export function plannerReportPricingFootnote(isKo: boolean): string {
  return isKo
    ? `${mediaPriceExclNoteText(true)}. 표시 금액은 매체 송출료 기준이며, 제작·설치 비용은 매체별 별도 협의가 필요합니다.`
    : `${mediaPriceExclNoteText(false)}. Shown amounts are media fees; production and installation require separate discussion per media.`;
}
