/** 플래너 PDF/PPT/웹 푸터 — VAT는 견적 요약 표에서만 표시, 여기서는 제작·설치만 고지 */
export function plannerReportPricingFootnote(isKo: boolean): string {
  return isKo
    ? "표시 금액은 매체 송출료 기준이며, 제작·설치 비용은 매체별 별도 협의가 필요합니다."
    : "Shown amounts are media fees; production and installation require separate discussion per media.";
}
