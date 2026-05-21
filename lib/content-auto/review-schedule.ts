/** 어드민 검토 후 발행 — 초안 생성 시 예약 발행 시각 (기본 +2일) */
export function defaultContentReviewScheduledAt(
  from = new Date(),
  reviewDays = Number(process.env.CONTENT_REVIEW_DAYS ?? "2"),
): Date {
  const days = Number.isFinite(reviewDays) && reviewDays > 0 ? reviewDays : 2;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
