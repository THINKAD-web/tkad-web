/**
 * 매체 썸네일 URL 헬스 체크 — 깨진 이미지(404/5xx) 탐지.
 * 스케줄: Vercel Cron `0 5 * * 1` (UTC 월요일)
 */

import type { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { scanBrokenMediaImages } from "@/lib/media-image-health";
import { notifyBrokenMediaImagesSlack } from "@/lib/media-image-health-slack";

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

  try {
    const result = await scanBrokenMediaImages();
    const slack = await notifyBrokenMediaImagesSlack(result);
    return json({ ok: true, slack, ...result });
  } catch (e) {
    console.error("[cron/check-media-images]", e);
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "scan_failed",
      },
      500,
    );
  }
}
