/** 보고서·견적서 공용 — 긴 스펙/송출 문구 줄임 */
export function truncateDocText(text: string, maxLen = 80): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** 원 → 만원 표기 (미리보기·PDF 공용) */
export function formatDocumentManWon(won: number, isKo: boolean): string {
  const man = Math.round(won / 10_000);
  const num = man.toLocaleString(isKo ? "ko-KR" : "en-US");
  if (isKo) return `₩${num}만원`;
  return `₩${num} (10K KRW)`;
}
