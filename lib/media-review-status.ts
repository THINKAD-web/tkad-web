/**
 * Phase B Operational catalog review flags.
 *
 * Not Fact / Signal / Computed. Lives on `Media` next to `isActive` / `isVerified`.
 * PR4 lockdown (`COMPUTED_FIELDS_LOCKED`) must not include these fields.
 */
import type { Prisma } from "@prisma/client";

export const MEDIA_REVIEW_STATUS = {
  clean: "clean",
  flagged: "flagged",
  reviewed: "reviewed",
} as const;

export type MediaReviewStatus =
  (typeof MEDIA_REVIEW_STATUS)[keyof typeof MEDIA_REVIEW_STATUS];

export const MEDIA_REVIEW_REASON = {
  package_magnitude: "package_magnitude",
  subway_monthly_cap: "subway_monthly_cap",
  network_daily_cap: "network_daily_cap",
} as const;

export type MediaReviewReason =
  (typeof MEDIA_REVIEW_REASON)[keyof typeof MEDIA_REVIEW_REASON];

export const MEDIA_REVIEW_REASON_LABEL_KO: Record<string, string> = {
  package_magnitude: "일유동 2M 이상 Package 매체 — 수치 확인 필요",
  subway_monthly_cap: "지하철 월노출 15M 초과 — 수치 확인 필요",
  network_daily_cap: "네트워크 일유동 5M 초과 — 수치 확인 필요",
};

export function isMediaReviewStatus(v: unknown): v is MediaReviewStatus {
  return (
    v === MEDIA_REVIEW_STATUS.clean ||
    v === MEDIA_REVIEW_STATUS.flagged ||
    v === MEDIA_REVIEW_STATUS.reviewed
  );
}

export function reviewReasonLabelKo(reason: string | null | undefined): string {
  if (!reason) return "수치 확인 필요";
  return MEDIA_REVIEW_REASON_LABEL_KO[reason] ?? reason;
}

/** Customer-facing: hide `flagged`. `clean` and `reviewed` stay visible. */
export function publicNotFlaggedMediaWhere(): Prisma.MediaWhereInput {
  return { reviewStatus: { not: MEDIA_REVIEW_STATUS.flagged } };
}

/** Active + not flagged. Extra ANDed. Admin/owner queries must not use this. */
export function publicActiveMediaWhere(
  extra?: Prisma.MediaWhereInput,
): Prisma.MediaWhereInput {
  const parts: Prisma.MediaWhereInput[] = [
    { isActive: true },
    publicNotFlaggedMediaWhere(),
  ];
  if (extra) parts.push(extra);
  return { AND: parts };
}

/**
 * Phase B 1단계 A/B/C 확정 6건. D/E 포함 금지.
 * 값(impressions/dailyFootfall) 수정 금지 — 플래그만.
 */
export const PHASE_B_ABC_FLAG_TARGETS: ReadonlyArray<{
  mediaId: string;
  reviewReason: MediaReviewReason;
}> = [
  {
    mediaId: "cmqkaqs8t000004l5l4p9crkn",
    reviewReason: MEDIA_REVIEW_REASON.package_magnitude,
  },
  {
    mediaId: "cmp3biu21000004l8a8ijkh9c",
    reviewReason: MEDIA_REVIEW_REASON.subway_monthly_cap,
  },
  {
    mediaId: "cmp3csmb2000004l43sen816g",
    reviewReason: MEDIA_REVIEW_REASON.subway_monthly_cap,
  },
  {
    mediaId: "cmqsrz8n300000ajiqljoibbc",
    reviewReason: MEDIA_REVIEW_REASON.subway_monthly_cap,
  },
  {
    mediaId: "cmqt7egdr000104l54jc6hrmc",
    reviewReason: MEDIA_REVIEW_REASON.subway_monthly_cap,
  },
  {
    mediaId: "cmozef5v4000404l21zc780sn",
    reviewReason: MEDIA_REVIEW_REASON.subway_monthly_cap,
  },
];

export const PHASE_B_ABC_FLAG_IDS = PHASE_B_ABC_FLAG_TARGETS.map(
  (t) => t.mediaId,
);
