/**
 * 광고주 자가 예약 신청 (status="requested" 생성).
 *
 * 정책:
 *   - Turnstile 검증 (운영 도메인만 강제, 다른 호스트 자동 우회)
 *   - rate limit: IP 기준 시간당 5건
 *   - 가입 사용자 / 익명 모두 허용 (가입이면 requestedByUserId 자동 연결)
 *   - 충돌 발견 시: **요청은 받음** (운영자가 검토에서 다른 일정 제안 가능),
 *     단 응답에 hasConflict=true 플래그 포함 → 광고주 UI 에서 안내 가능
 *   - 매체 비활성/존재 X → 404
 *   - 메일 2종 비동기 발송 (광고주 접수 / 어드민 알림). 메일 실패는 무시 (트랜잭션 보존).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { MediaBookingStatus } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import { getCurrentUser } from "@/lib/user-session";
import { findConflictingBookings } from "@/lib/booking-conflict";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  sendBookingRequestAdminAlert,
  sendBookingRequestReceived,
  type BookingRequestSummary,
} from "@/lib/booking-emails";
import { notifyMediaOwnerNewInquiry } from "@/lib/media-owner-notify";

export const dynamic = "force-dynamic";

const BOOKING_REQUEST_PER_HOUR = 5;
const anonRequestLimiter = rateLimit({
  limit: BOOKING_REQUEST_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});
const userRequestLimiter = rateLimit({
  limit: BOOKING_REQUEST_PER_HOUR * 2, // 가입 회원은 좀 더 관대
  windowMs: 60 * 60 * 1000,
});

const requestSchema = z.object({
  startsAt: z
    .string()
    .min(1)
    .refine(
      (v) => !Number.isNaN(new Date(v).getTime()),
      "Invalid startsAt date",
    ),
  endsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid endsAt date"),
  requesterName: z.string().trim().min(1, "이름 필수").max(80),
  requesterEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("올바른 이메일을 입력해주세요"),
  requesterPhone: z.string().trim().max(40).optional().nullable(),
  budgetWon: z.number().int().nonnegative().max(100_000_000_000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  /** 약관 동의 — 광고주가 명시적으로 체크해야 진행 */
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "약관에 동의해야 신청할 수 있습니다." }),
  }),
  turnstileToken: z.string().optional(),
  /** 봇 honeypot — 사람은 비워둠 */
  website: z.string().optional(),
});

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id: mediaId } = await params;
  const ip = getRequestIp(request);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // honeypot — bot 차단 (사람에겐 안 보임)
  if (
    raw &&
    typeof raw === "object" &&
    typeof (raw as Record<string, unknown>).website === "string" &&
    (raw as Record<string, string>).website.length > 0
  ) {
    // 봇으로 판단 — 200 으로 무시 (봇이 retry 하지 않게)
    return Response.json({ ok: true, id: "trap" }, { status: 201 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Turnstile (운영 도메인만 강제)
  const turnstile = await verifyTurnstileForRequest({
    token: body.turnstileToken,
    remoteip: ip,
    host: request.headers.get("host"),
  });
  if (!turnstile.ok) {
    return Response.json(
      { error: "캡차 검증에 실패했습니다.", reason: turnstile.reason },
      { status: 403 },
    );
  }

  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DB not configured" }, { status: 503 });
  }

  const me = await getCurrentUser();
  // rate limit — 가입 사용자는 user 키, 익명은 IP 키
  const limiter = me ? userRequestLimiter : anonRequestLimiter;
  const limiterKey = me ? `u:${me.id}` : `ip:${ip}`;
  if (!limiter.check(limiterKey)) {
    return Response.json(
      { error: "잠시 후 다시 시도해주세요. (신청 한도 초과)" },
      { status: 429 },
    );
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (endsAt <= startsAt) {
    return Response.json(
      { error: "종료일은 시작일보다 뒤여야 합니다." },
      { status: 400 },
    );
  }
  // 과거 시작일 차단
  if (startsAt < new Date(Date.now() - 86400000)) {
    return Response.json(
      { error: "과거 날짜는 신청할 수 없습니다." },
      { status: 400 },
    );
  }

  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { id: true, name: true, isActive: true, ownerUserId: true },
  });
  if (!media || !media.isActive) {
    return Response.json({ error: "Media not found" }, { status: 404 });
  }

  // 충돌 체크 — 요청은 받지만 hasConflict 플래그를 응답에 포함 (운영자 검토에 도움)
  const conflicts = await findConflictingBookings(db, {
    mediaId,
    startsAt,
    endsAt,
  });

  // 가입 사용자면 자동 prefill 우선 적용 (이메일/이름 일치 검증은 하지 않음 —
  // 회사 대표 명의로 신청하는 케이스 등 다양한 사용 패턴 허용)
  const requestedByUserId = me?.id ?? null;
  const requesterName = body.requesterName.trim();
  const requesterEmail = body.requesterEmail.trim();
  const requesterPhone = body.requesterPhone?.trim() || null;
  const budgetWon = body.budgetWon ?? null;
  const notes = body.notes?.trim() || null;

  // title — 광고주 식별 정보가 필드에 없도록 일반 라벨로 통일
  // (운영자 검토 패널에서는 requester* 필드로 식별)
  const title = `예약 신청 · ${requesterName}`;

  try {
    const booking = await db.mediaBooking.create({
      data: {
        mediaId,
        title,
        startsAt,
        endsAt,
        status: MediaBookingStatus.requested,
        requestedByUserId,
        requesterName,
        requesterEmail,
        requesterPhone,
        budgetWon,
        notes,
      },
    });

    // 메일 — 트랜잭션 외부에서, 실패해도 무시 (생성 자체는 성공으로 응답)
    const summary: BookingRequestSummary = {
      id: booking.id,
      mediaName: media.name,
      mediaId,
      startsAt,
      endsAt,
      requesterName,
      requesterEmail,
      requesterPhone,
      budgetWon,
      notes,
    };
    void Promise.allSettled([
      sendBookingRequestReceived(requesterEmail, summary),
      sendBookingRequestAdminAlert(summary),
      media.ownerUserId
        ? notifyMediaOwnerNewInquiry({
            ownerUserId: media.ownerUserId,
            mediaName: media.name,
          })
        : Promise.resolve(),
    ]);

    return Response.json(
      {
        ok: true,
        id: booking.id,
        hasConflict: conflicts.length > 0,
        conflictCount: conflicts.length,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[public.booking-request.POST]", e);
    return Response.json(
      { error: "신청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
