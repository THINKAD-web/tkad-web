import { NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { buildReportDashboardData } from "@/lib/report/dashboard-data";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * GET /api/report/dashboard?locale=ko
 * 위젯 4종 (hot media · industry split · new media · cpm trend) 동시 조회.
 * 공개 API — 인증 불필요. 짧은 캐시는 caller(no-store)가 통제.
 */
export async function GET(req: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return apiError("DB_UNAVAILABLE", 503, {
        message: "데이터베이스가 설정되지 않았습니다.",
      });
    }
    const url = new URL(req.url);
    const isKo = (url.searchParams.get("locale") ?? "ko") !== "en";
    const data = await buildReportDashboardData({ isKo });
    return apiOk(data, {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (e) {
    return apiServerError(e, "report/dashboard");
  }
}
