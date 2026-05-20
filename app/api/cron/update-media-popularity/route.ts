/**
 * 매체 인기 점수 일괄 갱신 (찜·문의·조회·예약 가중, 7일/30일 블렌드).
 *
 * - 인증: `Authorization: Bearer ${CRON_SECRET}`
 * - 스케줄: Vercel Cron `0 15 * * *` (UTC) ≈ KST 자정
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { updateAllMediaPopularityScores } from "@/lib/media-popularity";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  try {
    const result = await updateAllMediaPopularityScores();
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/update-media-popularity]", e);
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "update_failed",
      },
      500,
    );
  }
}
