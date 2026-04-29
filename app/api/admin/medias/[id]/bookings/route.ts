import { NextRequest } from "next/server";
import { z } from "zod";
import { MediaBookingStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  findConflictingBookings,
  summarizeConflict,
} from "@/lib/booking-conflict";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 어드민이 직접 만들 수 있는 status — requested 는 광고주 자가 신청 전용 */
const ADMIN_CREATABLE_STATUSES = [
  MediaBookingStatus.tentative,
  MediaBookingStatus.confirmed,
  MediaBookingStatus.cancelled,
] as const;

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid startsAt"),
  endsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid endsAt"),
  status: z.enum(ADMIN_CREATABLE_STATUSES).default("tentative"),
  campaignId: z.string().trim().min(1).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  /** 충돌 발견 시에도 강제 등록 (운영 비상 상황) — 명시적 의도 표현 */
  force: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;
  const db = getPrisma();
  const bookings = await db.mediaBooking.findMany({
    where: { mediaId },
    orderBy: { startsAt: "asc" },
    include: { campaign: { select: { id: true, name: true } } },
  });
  return json({ bookings });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: mediaId } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }
  const { title, status, campaignId, notes, force } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (endsAt <= startsAt) {
    return json({ error: "endsAt 는 startsAt 보다 커야 합니다." }, 400);
  }

  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Media not found" }, 404);

  if (campaignId) {
    const c = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!c) return json({ error: "Campaign not found" }, 400);
  }

  // 차단 대상 status (tentative/confirmed) 일 때만 충돌 검사.
  // cancelled/expired 슬롯을 새로 만드는 경우는 단순 기록이므로 검사 생략.
  const willBlock =
    status === MediaBookingStatus.tentative ||
    status === MediaBookingStatus.confirmed;

  if (willBlock) {
    const conflicts = await findConflictingBookings(db, {
      mediaId,
      startsAt,
      endsAt,
    });
    if (conflicts.length > 0 && !force) {
      // 409 Conflict — 클라이언트는 사용자에게 충돌 내역 + 강제 등록 옵션 노출
      return json(
        {
          error: "예약 시간이 기존 활성 예약과 겹칩니다.",
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

  const booking = await db.mediaBooking.create({
    data: {
      mediaId,
      title,
      startsAt,
      endsAt,
      status,
      campaignId: campaignId || null,
      notes: notes?.trim() || null,
    },
  });
  return json({ booking, forced: force === true && willBlock }, 201);
}
