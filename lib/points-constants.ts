import type { PointEventType } from "@prisma/client";

export const POINT_REWARDS: Record<
  Exclude<
    PointEventType,
    | "REDEEM_PRO_DAY"
    | "REDEEM_PRO_WEEK"
    | "REDEEM_PRO_MONTH"
    | "REDEEM_REPORT"
    | "REDEEM_MEDIA_DETAIL"
    | "ADMIN_ADJUST"
    | "EXPIRED"
  >,
  number
> = {
  SIGNUP: 500,
  REVIEW_WRITE: 200,
  REVIEW_HELPFUL: 50,
  COMMUNITY_POST: 100,
  COMMUNITY_COMMENT: 30,
  REFERRAL: 1000,
  MEDIA_REGISTER: 500,
  INQUIRY_SUBMIT: 300,
  DAILY_CHECK: 10,
  PLANNER_COMPLETE: 150,
};

export const POINT_COSTS = {
  PRO_DAY: 100,
  PRO_WEEK: 600,
  PRO_MONTH: 2000,
  PDF_REPORT: 300,
  MEDIA_DETAIL: 50,
} as const;

export type RedeemType = keyof typeof POINT_COSTS;
