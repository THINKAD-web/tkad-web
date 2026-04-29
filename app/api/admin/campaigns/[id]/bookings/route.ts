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

/**
 * 캠페인에 매체 booking 을 연결한다 (`status` 기본 confirmed — 캠페인 구성용).
 * 충돌 발견 시 409 + 충돌 내역 반환. force=true 면 강제 등록.
 */
const createSchema = z.object({
  mediaId: z.string().trim().min(1),
  title: z.string().trim().max(200).optional(),
  startsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid startsAt"),
  endsAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid endsAt"),
  status: z.nativeEnum(MediaBookingStatus).optional(),
  force: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

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
  const { mediaId, force } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  const status = parsed.data.status ?? MediaBookingStatus.confirmed;

  if (endsAt <= startsAt) {
    return json({ error: "endsAt 는 startsAt 보다 커야 합니다." }, 400);
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) return json({ error: "Campaign not found" }, 404);

  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return json({ error: "Media not found" }, 404);

  // 활성 status (tentative/confirmed) 만 충돌 검사
  if (
    status === MediaBookingStatus.tentative ||
    status === MediaBookingStatus.confirmed
  ) {
    const conflicts = await findConflictingBookings(db, {
      mediaId,
      startsAt,
      endsAt,
    });
    if (conflicts.length > 0 && !force) {
      return json(
        {
          error: "이 매체의 기존 활성 예약과 시간이 겹칩니다.",
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
      campaignId: id,
      mediaId,
      title: parsed.data.title?.trim() || media.name,
      startsAt,
      endsAt,
      status,
    },
    include: {
      media: { select: { name: true, location: true, dailyFootfall: true } },
    },
  });

  return json({ booking, forced: force === true }, 201);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("bookingId");
  if (!bookingId) return json({ error: "bookingId 필수" }, 400);

  const db = getPrisma();
  const booking = await db.mediaBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking || booking.campaignId !== campaignId)
    return json({ error: "Not found" }, 404);

  await db.mediaBooking.delete({ where: { id: bookingId } });
  return json({ ok: true });
}
