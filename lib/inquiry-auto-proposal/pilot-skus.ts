/**
 * P2 파일럿 추정 SKU — 재한이 admin에서 확정하기 전 로직 검증용.
 * 이름은 프로덕션 카탈로그 표기와 동일해야 한다.
 */
export const PILOT_NAMED_SKU_NAMES = [
  "인천공항 국제선 T1 키로뷰 광고",
  "인천공항 국제선 T2 키로뷰 광고",
  "인천국제공항 키로뷰 Full Package 광고",
  "인천공항 T1 체크인 스퀘어 광고",
  "인천공항 T2 웰컴미디어월 광고",
] as const;

export const PILOT_DEFAULT_INQUIRY_TEXT = `인천공항 지정 매체:
- 인천공항 국제선 T1 키로뷰 광고
- 인천공항 국제선 T2 키로뷰 광고
- 인천국제공항 키로뷰 Full Package 광고
- 인천공항 T1 체크인 스퀘어 광고
- 인천공항 T2 웰컴미디어월 광고
휴게소 LED
예산 3,000만원
기간 1개월
`;

export const DEFAULT_PILOT_BUDGET_WON = 30_000_000;
