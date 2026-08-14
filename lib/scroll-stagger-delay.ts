/**
 * 스크롤 등장 애니메이션 스태거 (B-1 세컨더리 페이지 톤다운).
 *
 * 컴포넌트가 아니라 순수 함수만 담는다 — 서버 컴포넌트(`services/page.tsx`)와
 * 클라이언트 컴포넌트(`services-faq.tsx`) 양쪽에서 그대로 import 할 수 있다.
 */

/**
 * 스태거 1스텝 (ms).
 * 80ms 였을 때는 카드 6장이면 마지막 카드가 400ms 뒤에야 시작해
 * 목록 전체가 순차적으로 밀려 올라오는 인상이 강했다.
 */
export const SCROLL_STAGGER_STEP_MS = 30;

/**
 * 스태거 누적 상한 (ms). 항목이 많아도 마지막 카드는 이 시점에 시작한다.
 * 상한이 없으면 20번째 카드가 600ms 뒤에 등장해 "덜 로드된 페이지" 로 보인다.
 */
export const SCROLL_STAGGER_MAX_MS = 300;

/** 인덱스 → 스태거 지연(ms). 누적 상한을 넘지 않는다. */
export function staggerDelayMs(index: number): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(
    Math.round(index) * SCROLL_STAGGER_STEP_MS,
    SCROLL_STAGGER_MAX_MS,
  );
}
