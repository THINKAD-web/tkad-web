/**
 * Client-safe feature → minimum access level mapping.
 * DB/subscription resolution stays in `lib/report-access.ts`.
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

/** Mirrors Prisma `ReportAccessLevel` string values — no @prisma/client import */
export type EntitlementAccessLevel =
  | "FREE"
  | "MEMBER"
  | "PRO"
  | "ENTERPRISE";

export const FEATURE_MIN_LEVEL: Record<
  ReportFeature,
  EntitlementAccessLevel
> = {
  media_spec: "MEMBER",
  planner_result: "MEMBER",
  detail_data: "PRO",
  planner_pdf: "PRO",
  competitor: "PRO",
  simulation_full: "PRO",
  market_dashboard: "PRO",
  api: "ENTERPRISE",
  whitelabel: "ENTERPRISE",
};

export const LEVEL_RANK: Record<EntitlementAccessLevel, number> = {
  FREE: 0,
  MEMBER: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

export function rankLevel(level: EntitlementAccessLevel | string): number {
  return LEVEL_RANK[level as EntitlementAccessLevel];
}
