/**
 * 예약 신청(requested) 자동 만료.
 *
 * - status="requested" + createdAt 가 N일 이상 경과 → status="expired"
 * - 만료 기간: env BOOKING_REQUEST_EXPIRE_DAYS (기본 7일)
 * - 인증: `Authorization: Bearer ${CRON_SECRET}` (다른 cron 들과 동일 패턴)
 *
 * Vercel Cron 또는 외부 스케줄러에서 일 1회 호출 권장.
 */

import { NextRequest } from "next/server";
import { MediaBookingStatus } from "@prisma/client";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_EXPIRE_DAYS = 7;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

function getExpireDays(): number {
  const raw = process.env.BOOKING_REQUEST_EXPIRE_DAYS?.trim();
  if (!raw) return DEFAULT_EXPIRE_DAYS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_EXPIRE_DAYS;
}

async function runExpire(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  const days = getExpireDays();
  const cutoff = new Date(Date.now() - days * 86400000);
  const db = getPrisma();

  const result = await db.mediaBooking.updateMany({
    where: {
      status: MediaBookingStatus.requested,
      createdAt: { lt: cutoff },
    },
    data: {
      status: MediaBookingStatus.expired,
      decidedAt: new Date(),
    },
  });

  return json({
    ok: true,
    expiredCount: result.count,
    cutoffIso: cutoff.toISOString(),
    expireDays: days,
  });
}

/**
 * GET — Vercel Cron 표준 (UI 에서 cron 등록 시 GET 호출).
 * POST — 외부 스케줄러 / 수동 트리거.
 * 둘 다 동일하게 동작.
 */
export async function GET(request: NextRequest) {
  return runExpire(request);
}

export async function POST(request: NextRequest) {
  return runExpire(request);
}
