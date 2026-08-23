import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";

/** 보고서·PDF·PPTX — 예산 셀. ₩0 은 계약 리스크이므로 「가격 문의」로 통일 */
export function formatExportBudgetWonLabel(
  won: number,
  isKo: boolean,
): string {
  if (!Number.isFinite(won) || won <= 0) {
    return mediaPriceOnInquiryLabel(isKo ? "ko-KR" : "en-US");
  }
  return `₩${won.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

/** 테스트·린트 — 문자열에 ₩0 단독 표기가 없는지 */
export function assertNoZeroWonPriceDisplay(label: string): boolean {
  return !/(?:^|[^\d])₩0(?:[^\d]|$)/.test(label) && label !== "₩0";
}
