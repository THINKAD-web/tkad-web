import type { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import { geocodeMissingMediaLocations } from "@/lib/media-geocode-batch";
import { isDatabaseConfigured } from "@/lib/prisma";
import { readJson } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  limit?: number;
  dryRun?: boolean;
};

/**
 * POST /api/admin/media/geocode-missing
 * 주소 O · 위경도 X 매체를 카카오 지오코딩으로 일괄 보완.
 */
export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;
  if (!isDatabaseConfigured()) {
    return json({ error: "database_error", code: "DATABASE_NOT_CONFIGURED" }, 503);
  }

  const body = (await readJson<Body>(request)) ?? {};
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? body.limit
      : 50;
  const dryRun = body.dryRun === true;

  try {
    const result = await geocodeMissingMediaLocations({ limit, dryRun });
    return json({ ok: true, dryRun, ...result });
  } catch (e) {
    console.error("[admin/media/geocode-missing]", e);
    return json({ error: "지오코딩 일괄 처리에 실패했습니다." }, 500);
  }
}
