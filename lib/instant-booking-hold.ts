/**
 * 즉시예약 결제 대기 슬롯 홀드.
 * MediaBooking(tentative)로 짧은 TTL 동안 기간을 막아 동시 결제 레이스를 줄인다.
 */

import { MediaBookingStatus, InstantBookingStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { findConflictingBookings } from "@/lib/booking-conflict";

/** notes 에 심는 식별자 — cron 만료·디버그에 사용 */
export const INSTANT_PAYMENT_HOLD_MARKER = "[instant-payment-hold]";

/** 결제 대기 홀드 TTL (기본 30분) */
export const INSTANT_PAYMENT_HOLD_TTL_MS = 30 * 60 * 1000;

export function instantPaymentHoldExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INSTANT_PAYMENT_HOLD_TTL_MS);
}

export function formatInstantPaymentHoldNotes(
  bookingId: string,
  expiresAt: Date,
): string {
  return `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=${bookingId} expiresAt=${expiresAt.toISOString()}`;
}

export function parseInstantPaymentHoldBookingId(
  notes: string | null | undefined,
): string | null {
  if (!notes?.includes(INSTANT_PAYMENT_HOLD_MARKER)) return null;
  const m = notes.match(/bookingId=([^\s]+)/);
  return m?.[1]?.trim() || null;
}

type HoldDb = {
  mediaBooking: PrismaClient["mediaBooking"];
  booking: PrismaClient["booking"];
};

/**
 * 결제 대기 즉시예약을 위해 tentative MediaBooking 생성.
 * 호출 전 Booking row 가 있어야 하며, 성공 시 mediaBookingId 를 Booking 에 연결.
 */
export async function createInstantPaymentHold(
  db: HoldDb,
  params: {
    bookingId: string;
    mediaId: string;
    mediaName: string;
    startsAt: Date;
    endsAt: Date;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    userId?: string | null;
    amount: number;
  },
): Promise<{ mediaBookingId: string }> {
  const conflicts = await findConflictingBookings(db, {
    mediaId: params.mediaId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  });
  if (conflicts.length > 0) {
    const err = new Error("SELECTED_RANGE_CONFLICT");
    err.name = "InstantHoldConflictError";
    throw err;
  }

  const expiresAt = instantPaymentHoldExpiresAt();
  const mediaBooking = await db.mediaBooking.create({
    data: {
      mediaId: params.mediaId,
      title: `[즉시예약 홀드] ${params.mediaName}`.slice(0, 200),
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      status: MediaBookingStatus.tentative,
      notes: formatInstantPaymentHoldNotes(params.bookingId, expiresAt),
      requestedByUserId: params.userId ?? null,
      requesterName: params.contactName,
      requesterEmail: params.contactEmail,
      requesterPhone: params.contactPhone ?? null,
      budgetWon: params.amount,
    },
  });

  await db.booking.update({
    where: { id: params.bookingId },
    data: { mediaBookingId: mediaBooking.id },
  });

  return { mediaBookingId: mediaBooking.id };
}

/** 결제 완료 시 홀드 → confirmed (없으면 생성은 호출자 책임) */
export async function confirmInstantPaymentHold(
  db: HoldDb,
  mediaBookingId: string,
  bookingId: string,
): Promise<void> {
  await db.mediaBooking.update({
    where: { id: mediaBookingId },
    data: {
      status: MediaBookingStatus.confirmed,
      notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=${bookingId} fulfilledAt=${new Date().toISOString()}`,
      decidedAt: new Date(),
    },
  });
}

/**
 * TTL 지난 payment_pending 즉시예약 + 연결 tentative 홀드 만료.
 * @returns 만료된 Booking 수
 */
export async function expireStaleInstantPaymentHolds(
  db: HoldDb,
  now = new Date(),
): Promise<{ expiredBookings: number; expiredHolds: number }> {
  const cutoff = new Date(now.getTime() - INSTANT_PAYMENT_HOLD_TTL_MS);

  const staleBookings = await db.booking.findMany({
    where: {
      status: InstantBookingStatus.payment_pending,
      mediaBookingId: { not: null },
      createdAt: { lt: cutoff },
    },
    select: { id: true, mediaBookingId: true },
  });

  let expiredBookings = 0;
  let expiredHolds = 0;

  for (const row of staleBookings) {
    await db.booking.update({
      where: { id: row.id },
      data: { status: InstantBookingStatus.cancelled },
    });
    expiredBookings++;

    if (row.mediaBookingId) {
      await db.mediaBooking.updateMany({
        where: {
          id: row.mediaBookingId,
          status: MediaBookingStatus.tentative,
        },
        data: {
          status: MediaBookingStatus.expired,
          decidedAt: now,
          notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=${row.id} expiredAt=${now.toISOString()}`,
        },
      });
      expiredHolds++;
    }
  }

  // Booking 없이 남은 orphan 홀드
  const orphanHolds = await db.mediaBooking.findMany({
    where: {
      status: MediaBookingStatus.tentative,
      notes: { contains: INSTANT_PAYMENT_HOLD_MARKER },
      createdAt: { lt: cutoff },
    },
    select: { id: true, notes: true },
  });

  for (const hold of orphanHolds) {
    const bookingId = parseInstantPaymentHoldBookingId(hold.notes);
    const linked = bookingId
      ? await db.booking.findFirst({
          where: { id: bookingId },
          select: { id: true, status: true },
        })
      : null;
    if (linked && linked.status !== InstantBookingStatus.payment_pending) {
      continue;
    }
    await db.mediaBooking.update({
      where: { id: hold.id },
      data: {
        status: MediaBookingStatus.expired,
        decidedAt: now,
        notes: `${hold.notes ?? ""}\n[expired-orphan] ${now.toISOString()}`.slice(
          0,
          2000,
        ),
      },
    });
    expiredHolds++;
    if (linked?.status === InstantBookingStatus.payment_pending) {
      await db.booking.update({
        where: { id: linked.id },
        data: { status: InstantBookingStatus.cancelled },
      });
      expiredBookings++;
    }
  }

  return { expiredBookings, expiredHolds };
}

export function isInstantHoldConflictError(e: unknown): boolean {
  return e instanceof Error && e.name === "InstantHoldConflictError";
}
