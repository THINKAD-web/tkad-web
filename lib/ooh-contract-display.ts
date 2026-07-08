/** 계약서 PDF·어드민 UI 공용 — 표준/특약 문구 단일 소스 */

export const OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_KO =
  "별도 합의가 없는 한, 송출 일정·소재 규격은 매체사 정책 및 싱커드 운영 기준을 따릅니다.";

export const OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN =
  "Unless otherwise agreed, scheduling and specs follow media owner policies and THINKAD operations.";

export const OOH_CONTRACT_GENERAL_TERMS_KO =
  "본 계약은 전자서명 및 기록된 메타데이터(서명 시각, 접속 IP 등)와 함께 보관됩니다. 분쟁 시 대한민국 법을 준거법으로 합니다.";

export const OOH_CONTRACT_GENERAL_TERMS_EN =
  "This agreement is stored with e-signature metadata (timestamp, IP). Governing law: Republic of Korea.";

export function effectiveSpecialTerms(
  isKo: boolean,
  specialTerms: string | null | undefined,
): string {
  const trimmed = specialTerms?.trim();
  if (trimmed) return trimmed;
  return isKo
    ? OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_KO
    : OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN;
}

export function generalContractTerms(isKo: boolean): string {
  return isKo ? OOH_CONTRACT_GENERAL_TERMS_KO : OOH_CONTRACT_GENERAL_TERMS_EN;
}

/** 부킹 확정 이후 계약 PDF 미리보기 가능 */
export const OOH_CONTRACT_PREVIEW_STATUSES = [
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
] as const;

export function canPreviewOohContract(status: string): boolean {
  return (OOH_CONTRACT_PREVIEW_STATUSES as readonly string[]).includes(status);
}
