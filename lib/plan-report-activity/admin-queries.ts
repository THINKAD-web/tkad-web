import { getPrisma } from "@/lib/prisma";
import type {
  AdminPlanReportActivityRow,
  PlanReportActivityEvent,
  PlanReportActivitySource,
} from "@/lib/plan-report-activity/types";

const userSelect = {
  id: true,
  name: true,
  email: true,
  company: true,
} as const;

export async function listAdminPlanReportActivities(args: {
  page: number;
  pageSize: number;
  userId?: string;
  eventType?: string;
  source?: string;
}): Promise<{
  items: AdminPlanReportActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = getPrisma();
  const page = Math.max(1, args.page);
  const pageSize = Math.min(50, Math.max(1, args.pageSize));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(args.userId ? { userId: args.userId } : {}),
    ...(args.eventType && args.eventType !== "all"
      ? { eventType: args.eventType }
      : {}),
    ...(args.source && args.source !== "all" ? { source: args.source } : {}),
  };

  const [rows, total] = await Promise.all([
    db.planReportActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { user: { select: userSelect } },
    }),
    db.planReportActivity.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      eventType: row.eventType as PlanReportActivityEvent,
      source: row.source as PlanReportActivitySource,
      format: row.format,
      mediaCount: row.mediaCount,
      goalTitle: row.goalTitle,
      regionsText: row.regionsText,
      reportTitle: row.reportTitle,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
    })),
    total,
    page,
    pageSize,
  };
}
