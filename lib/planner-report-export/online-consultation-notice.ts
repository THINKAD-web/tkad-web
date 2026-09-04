/** dmpilot `consultationLineNotice` — inquiry online lines in report KPI area. */
export function onlineConsultationLineNotice(
  inquiryLineCount: number,
  isKo: boolean,
): string | null {
  if (inquiryLineCount <= 0) return null;
  return isKo
    ? `${inquiryLineCount}개 상품은 별도 협의 필요`
    : `${inquiryLineCount} product(s) require separate consultation`;
}

export const ONLINE_CATALOG_ESTIMATION_NOTICE_KO =
  "디지털 예상 도달·클릭은 공개 매체 카탈로그의 CPC·CPM 참고 범위를 예산에 적용해 산출한 값입니다. 실제 성과는 소재·시즌·경쟁 상황에 따라 달라질 수 있습니다.";

export const ONLINE_CATALOG_ESTIMATION_NOTICE_EN =
  "Estimated reach and clicks apply catalog CPC/CPM reference ranges to each channel budget. Actual performance may vary by creative, season, and auction dynamics.";

export function onlineCatalogEstimationNotice(isKo: boolean): string {
  return isKo ? ONLINE_CATALOG_ESTIMATION_NOTICE_KO : ONLINE_CATALOG_ESTIMATION_NOTICE_EN;
}
