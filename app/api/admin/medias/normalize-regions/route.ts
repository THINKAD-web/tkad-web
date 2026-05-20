import type { NextRequest } from "next/server";
import { assertAdmin, json } from "@/lib/admin-guard";
import { normalizeAllMediaRegions } from "@/lib/media-region-batch";
import { isDatabaseConfigured } from "@/lib/prisma";
import { readJson } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  limit?: number;
  onlyMissingZone?: boolean;
};

/**
 * POST /api/admin/medias/normalize-regions
 * 구·주소 기반 region / regionZone 표준화.
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
      : undefined;

  try {
    const result = await normalizeAllMediaRegions({
      limit,
      onlyMissingZone: body.onlyMissingZone === true,
    });
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[admin/medias/normalize-regions]", e);
    return json({ error: "권역 정규화에 실패했습니다." }, 500);
  }
}
