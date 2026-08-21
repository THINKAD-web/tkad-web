/**
 * CampaignPlan metric basis → screen/export badge kind.
 *
 * Must stay in `lib/` (no "use client"). Report PDF build and the
 * admin inquiry dry-run run this on the server.
 */

import type { MetricBasis } from "@/lib/metrics/defaults";

export type BadgeKind = "measured" | "estimated" | "pending";

export function basisToBadge(basis: MetricBasis | null | undefined): BadgeKind {
  if (basis == null) return "pending";
  if (basis === "measured") return "measured";
  return "estimated";
}
