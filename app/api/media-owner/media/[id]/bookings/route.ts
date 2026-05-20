import { NextRequest } from "next/server";
import { z } from "zod";
import { MediaBookingStatus } from "@prisma/client";
import { apiError, apiOk, apiZodError } from "@/lib/api-response";
import {
  assertOwnsMedia,
  requireMediaOwner,
} from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import {
  findConflictingBookings,
  summarizeConflict,
} from "@/lib/booking-conflict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const blockSchema = z.object({
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const { id: mediaId } = await params;
  if (!(await assertOwnsMedia(auth.user.id, mediaId))) {
    return apiError("NOT_FOUND", 404);
  }

  const db = getPrisma();
  const bookings = await db.mediaBooking.findMany({
    where: { mediaId },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      isOwnerBlock: true,
      notes: true,
    },
  });

  return apiOk({ bookings });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const { id: mediaId } = await params;
  if (!(await assertOwnsMedia(auth.user.id, mediaId))) {
    return apiError("NOT_FOUND", 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("INVALID_INPUT", 400);
  }
  const parsed = blockSchema.safeParse(raw);
  if (!parsed.success) return apiZodError(parsed.error);

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return apiError("INVALID_INPUT", 400, {
      message: "종료일은 시작일보다 뒤여야 합니다.",
    });
  }

  const db = getPrisma();
  const conflicts = await findConflictingBookings(db, {
    mediaId,
    startsAt,
    endsAt,
  });
  if (conflicts.some((c) => !c.isOwnerBlock)) {
    return apiError("BOOKING_CONFLICT", 409, {
      message: "이미 확정·협의 중인 집행과 겹칩니다.",
      issues: conflicts.map((c) => summarizeConflict(c, "ko")),
    });
  }

  const booking = await db.mediaBooking.create({
    data: {
      mediaId,
      title: "[매체사] 집행 불가",
      startsAt,
      endsAt,
      status: MediaBookingStatus.confirmed,
      isOwnerBlock: true,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return apiOk({ booking }, { status: 201 });
}
