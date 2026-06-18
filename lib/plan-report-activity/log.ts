import { getPrisma } from "@/lib/prisma";
import type { PlanReportActivityInput } from "@/lib/plan-report-activity/types";

export async function logPlanReportActivity(
  userId: string,
  input: PlanReportActivityInput,
): Promise<void> {
  const db = getPrisma();
  if (!db.planReportActivity) return;

  await db.planReportActivity.create({
    data: {
      userId,
      eventType: input.eventType,
      source: input.source,
      format: input.format ?? null,
      mediaCount: input.mediaCount ?? 0,
      goalTitle: input.goalTitle?.slice(0, 120) ?? null,
      regionsText: input.regionsText?.slice(0, 500) ?? null,
      reportTitle: input.reportTitle?.slice(0, 200) ?? null,
    },
  });
}

/** 응답 지연 없이 백그라운드 기록 */
export function logPlanReportActivityFireAndForget(
  userId: string,
  input: PlanReportActivityInput,
): void {
  void logPlanReportActivity(userId, input).catch((e) => {
    console.error("[plan-report-activity]", e);
  });
}
