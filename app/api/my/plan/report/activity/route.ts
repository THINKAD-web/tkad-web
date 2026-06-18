import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import { logPlanReportActivityFireAndForget } from "@/lib/plan-report-activity/log";
import {
  PLAN_REPORT_ACTIVITY_EVENTS,
  PLAN_REPORT_ACTIVITY_SOURCES,
} from "@/lib/plan-report-activity/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  eventType: z.enum(PLAN_REPORT_ACTIVITY_EVENTS),
  source: z.enum(PLAN_REPORT_ACTIVITY_SOURCES),
  format: z.enum(["pdf", "pptx"]).optional(),
  mediaCount: z.number().int().nonnegative().optional(),
  goalTitle: z.string().max(120).optional(),
  regionsText: z.string().max(500).optional(),
  reportTitle: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    logPlanReportActivityFireAndForget(user.id, parsed.data);

    return apiOk({ logged: true });
  } catch (e) {
    return apiServerError(e, "my/plan/report/activity");
  }
}
