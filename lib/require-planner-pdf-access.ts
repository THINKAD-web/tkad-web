import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";

/** 견적서·제안서·플래너 보고서 PDF/PPT — `planner_pdf` PRO 티어 */
export async function requirePlannerPdfAccess(): Promise<
  | { allowed: true; userId: string | null }
  | { allowed: false; status: 401 | 403 }
> {
  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "planner_pdf");
  if (!access.allowed) {
    const status = user?.id ? 403 : 401;
    return { allowed: false, status };
  }
  return { allowed: true, userId: user?.id ?? null };
}
