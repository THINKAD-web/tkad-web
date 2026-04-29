import { NextRequest } from "next/server";
import { z } from "zod";
import { MediaBookingStatus, type Prisma } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  findConflictingBookings,
  summarizeConflict,
} from "@/lib/booking-conflict";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * 어드민 PATCH 가 가능한 상태 전환.
 *   requested  → tentative | confirmed | cancelled
 *   tentative  → confirmed | cancelled  (다시 requested 로 되돌리지 않음)
 *   confirmed  → cancelled  (확정 후엔 취소만)
 *   cancelled  → tentative  (오등록 복구)
 *   expired    → tentative  (자동 만료된 신청 부활)
 *
 * 동일 status 로의 PATCH(상태 변경 X) 는 허용 (시간/제목/메모만 수정).
 */
const ALLOWED_TRANSITIONS: Record<MediaBookingStatus, MediaBookingStatus[]> = {
  requested: [
    MediaBookingStatus.tentative,
    MediaBookingStatus.confirmed,
    MediaBookingStatus.cancelled,
  ],
  tentative: [MediaBookingStatus.confirmed, MediaBookingStatus.cancelled],
  confirmed: [MediaBookingStatus.cancelled],
  cancelled: [MediaBookingStatus.tentative],
  expired: [MediaBookingStatus.tentative],
};

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(MediaBookingStatus).optional(),
  notes: z.string().max(2000).nullable().optional(),
  startsAt: z
    .string()
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "Invalid startsAt",
    )
    .optional(),
  endsAt: z
    .string()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Invalid endsAt")
    .optional(),
  campaignId: z.string().trim().nullable().optional(),
  /** 시간 변경 시 충돌 무시 강제 등록 (어드민 운영 비상시) */
  force: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }
  const body = parsed.data;

  const db = getPrisma();
  const existing = await db.mediaBooking.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.MediaBookingUpdateInput = {};

  // 1) 상태 전환 검증
  if (body.status && body.status !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(body.status)) {
      return json(
        {
          error: `상태 전환 불가: ${existing.status} → ${body.status}`,
          code: "INVALID_TRANSITION",
          allowed,
        },
        400,
      );
    }
    data.status = body.status;
    data.decidedAt = new Date();
    // decidedByAdminId 는 admin session 식별자가 추후 추가되면 연결
  }

  // 2) 시간 / 활성화 진입 시점에 충돌 재검사
  const newStatus = (body.status ?? existing.status) as MediaBookingStatus;
  const newStartsAt = body.startsAt ? new Date(body.startsAt) : existing.startsAt;
  const newEndsAt = body.endsAt ? new Date(body.endsAt) : existing.endsAt;

  if (newEndsAt <= newStartsAt) {
    return json({ error: "endsAt 는 startsAt 보다 커야 합니다." }, 400);
  }

  const willBlock =
    newStatus === MediaBookingStatus.tentative ||
    newStatus === MediaBookingStatus.confirmed;
  const timeChanged =
    body.startsAt !== undefined || body.endsAt !== undefined;
  const becameActive =
    body.status !== undefined &&
    willBlock &&
    existing.status !== MediaBookingStatus.tentative &&
    existing.status !== MediaBookingStatus.confirmed;

  if (willBlock && (timeChanged || becameActive)) {
    const conflicts = await findConflictingBookings(db, {
      mediaId: existing.mediaId,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      excludeBookingId: existing.id,
    });
    if (conflicts.length > 0 && !body.force) {
      return json(
        {
          error: "변경된 시간이 다른 활성 예약과 겹칩니다.",
          code: "BOOKING_CONFLICT",
          conflicts: conflicts.map((c) => ({
            id: c.id,
            title: c.title,
            startsAt: c.startsAt.toISOString(),
            endsAt: c.endsAt.toISOString(),
            status: c.status,
            summary: summarizeConflict(c, "ko"),
          })),
        },
        409,
      );
    }
  }

  // 3) 일반 필드 적용
  if (body.title != null) data.title = body.title.trim();
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.startsAt) data.startsAt = newStartsAt;
  if (body.endsAt) data.endsAt = newEndsAt;
  if (body.campaignId !== undefined) {
    data.campaign = body.campaignId
      ? { connect: { id: body.campaignId } }
      : { disconnect: true };
  }

  try {
    const booking = await db.mediaBooking.update({ where: { id }, data });
    return json({ booking });
  } catch (e) {
    console.error("[admin.media-bookings.PATCH]", e);
    return json({ error: "업데이트에 실패했습니다." }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.mediaBooking.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
