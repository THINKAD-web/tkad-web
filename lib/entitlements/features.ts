/**
 * Client-safe feature → minimum access level mapping.
 * DB/subscription resolution stays in `lib/report-access.ts`.
 *
 * Rank: FREE < MEMBER < LITE < PRO < ENTERPRISE
 * AGENCY / PRO_TRIAL map to PRO for feature gates (same entitlements as PRO).
 */

export type ReportFeature =
  | "planner_pdf"
  | "detail_data"
  | "competitor"
  | "api"
  | "planner_result"
  | "media_spec"
  | "simulation_full"
  | "whitelabel"
  | "market_dashboard";

/** Mirrors Prisma `ReportAccessLevel` (+ product tiers) — no @prisma/client import */
export type EntitlementAccessLevel =
  | "FREE"
  | "MEMBER"
  | "LITE"
  | "PRO"
  | "ENTERPRISE";

export const FEATURE_MIN_LEVEL: Record<
  ReportFeature,
  EntitlementAccessLevel
> = {
  media_spec: "MEMBER",
  /** LITE — 플래너 결과 열람 */
  planner_result: "LITE",
  /** LITE — PDF 다운로드 (FREE 1회 체험은 별도 consume) */
  planner_pdf: "LITE",
  detail_data: "PRO",
  competitor: "PRO",
  simulation_full: "PRO",
  market_dashboard: "PRO",
  api: "ENTERPRISE",
  whitelabel: "ENTERPRISE",
};

export const LEVEL_RANK: Record<EntitlementAccessLevel, number> = {
  FREE: 0,
  MEMBER: 1,
  LITE: 2,
  PRO: 3,
  ENTERPRISE: 4,
};

export function rankLevel(level: EntitlementAccessLevel | string): number {
  return LEVEL_RANK[level as EntitlementAccessLevel] ?? 0;
}
