import { mediaQuoteOnlyLabel } from "@/lib/media-pricing-mode";

/** 보고서·PDF·PPTX — 예산 셀. 협의가·무단가는 「문의」 */
export function formatExportBudgetWonLabel(
  won: number,
  isKo: boolean,
): string {
  if (!Number.isFinite(won) || won <= 0) {
    return mediaQuoteOnlyLabel(isKo);
  }
  return `₩${won.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

/** 테스트·린트 — 문자열에 ₩0 단독 표기가 없는지 */
export function assertNoZeroWonPriceDisplay(label: string): boolean {
  return !/(?:^|[^\d])₩0(?:[^\d]|$)/.test(label) && label !== "₩0";
}
