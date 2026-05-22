/** 성과 데이터 보증 배지 — 집행·리뷰·평점·인증 사진 기준 */
export const PERFORMANCE_GUARANTEE_MIN_EXECUTIONS = 5;
export const PERFORMANCE_GUARANTEE_MIN_REVIEWS = 3;
export const PERFORMANCE_GUARANTEE_MIN_RATING = 4.0;

export type PerformanceGuaranteeInput = {
  executionCount: number;
  reviewCount: number;
  averageRating?: number | null;
  certifiedPhotoCount: number;
};

export function isPerformanceGuaranteed(
  input: PerformanceGuaranteeInput,
): boolean {
  return (
    input.executionCount >= PERFORMANCE_GUARANTEE_MIN_EXECUTIONS &&
    input.reviewCount >= PERFORMANCE_GUARANTEE_MIN_REVIEWS &&
    (input.averageRating ?? 0) >= PERFORMANCE_GUARANTEE_MIN_RATING &&
    input.certifiedPhotoCount >= 1
  );
}
