import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import type { ReportFeature } from "@/lib/report-access-shared";

export type ReportAccessGateResult =
  | { allowed: true; userId: string | null }
  | { allowed: false; status: 401 | 403 };

/** 서버 라우트용 — `checkReportAccess` 와 동일 레벨 기준, HTTP 상태만 매핑 */
export async function requireReportAccess(
  feature: ReportFeature,
): Promise<ReportAccessGateResult> {
  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, feature);
  if (!access.allowed) {
    const status: 401 | 403 =
      !user?.id && access.reason === "login" ? 401 : 403;
    return { allowed: false, status };
  }
  return { allowed: true, userId: user?.id ?? null };
}
