/**
 * OoH 견적 ↔ MediaBooking 가용 캘린더 홀드 (#224 P1).
 *
 * - booking_confirmed → tentative 홀드 생성
 * - contract_confirmed → confirmed 승격
 * - cancel / withdraw → cancelled 해제
 */

import {
  MediaBookingStatus,
  type MediaBooking,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import {
  findConflictingBookings,
  summarizeConflict,
  type BookingConflictDb,
} from "@/lib/booking-conflict";
import { estimateEndDate } from "@/lib/ooh-quote";

export type QuoteHoldDb = BookingConflictDb & {
  media: PrismaClient["media"];
  mediaBooking: PrismaClient["mediaBooking"];
};

export type QuoteHoldSource = {
  id: string;
  clientName: string;
  mediaIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  periodKey: string | null;
  period: string;
};

export type HoldConflictItem = {
  id: string;
  mediaId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  summary: string;
};

export class BookingHoldConflictError extends Error {
  readonly code = "BOOKING_CONFLICT" as const;
  readonly conflicts: HoldConflictItem[];

  constructor(conflicts: HoldConflictItem[]) {
    super("예약 시간이 기존 활성 예약과 겹칩니다.");
    this.name = "BookingHoldConflictError";
    this.conflicts = conflicts;
  }
}

export class QuoteHoldDatesRequiredError extends Error {
  readonly code = "QUOTE_DATES_REQUIRED" as const;

  constructor() {
    super("부킹 홀드 생성에 시작일이 필요합니다.");
    this.name = "QuoteHoldDatesRequiredError";
  }
}

/** 시작·종료일 해석 — endDate 없으면 periodKey로 추정 */
export function resolveQuoteHoldRange(quote: QuoteHoldSource): {
  startsAt: Date;
  endsAt: Date;
} {
  if (!quote.startDate) {
    throw new QuoteHoldDatesRequiredError();
  }
  const startsAt = new Date(quote.startDate);
  startsAt.setHours(0, 0, 0, 0);

  let endsAt: Date;
  if (quote.endDate) {
    endsAt = new Date(quote.endDate);
    endsAt.setHours(23, 59, 59, 999);
  } else {
    endsAt = estimateEndDate(startsAt, quote.periodKey);
    endsAt.setHours(23, 59, 59, 999);
  }

  if (endsAt <= startsAt) {
    throw new QuoteHoldDatesRequiredError();
  }
  return { startsAt, endsAt };
}

function uniqueMediaIds(mediaIds: string[]): string[] {
  return [...new Set(mediaIds.map((id) => id.trim()).filter(Boolean))];
}

function toConflictItem(b: MediaBooking): HoldConflictItem {
  return {
    id: b.id,
    mediaId: b.mediaId,
    title: b.title,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    summary: summarizeConflict(b, "ko"),
  };
}

/**
 * booking_confirmed 시 매체별 tentative 홀드 생성 (all-or-nothing).
 * 이미 동일 견적 홀드가 있으면 재생성하지 않음 (idempotent).
 */
export async function createHoldsForQuote(
  db: QuoteHoldDb,
  quote: QuoteHoldSource,
  opts?: { force?: boolean },
): Promise<{ created: number; skipped: boolean }> {
  const mediaIds = uniqueMediaIds(quote.mediaIds);
  if (mediaIds.length === 0) {
    return { created: 0, skipped: true };
  }

  const existing = await db.mediaBooking.count({
    where: {
      oohQuoteId: quote.id,
      status: { in: [MediaBookingStatus.tentative, MediaBookingStatus.confirmed] },
    },
  });
  if (existing > 0) {
    return { created: 0, skipped: true };
  }

  const { startsAt, endsAt } = resolveQuoteHoldRange(quote);
  const force = opts?.force === true;

  const allConflicts: MediaBooking[] = [];
  for (const mediaId of mediaIds) {
    const conflicts = await findConflictingBookings(db, {
      mediaId,
      startsAt,
      endsAt,
      excludeOohQuoteId: quote.id,
    });
    allConflicts.push(...conflicts);
  }

  if (allConflicts.length > 0 && !force) {
    throw new BookingHoldConflictError(allConflicts.map(toConflictItem));
  }

  const medias = await db.media.findMany({
    where: { id: { in: mediaIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(medias.map((m) => [m.id, m.name]));

  const rows: Prisma.MediaBookingCreateManyInput[] = mediaIds.map((mediaId) => {
    const mediaName = nameById.get(mediaId) ?? mediaId.slice(0, 8);
    return {
      mediaId,
      title: `[OoH 홀드] ${quote.clientName} · ${mediaName}`.slice(0, 200),
      startsAt,
      endsAt,
      status: MediaBookingStatus.tentative,
      oohQuoteId: quote.id,
      notes: `OohQuote ${quote.id}\nperiod=${quote.period}`,
    };
  });

  const result = await db.mediaBooking.createMany({ data: rows });
  return { created: result.count, skipped: false };
}

/** contract_confirmed 시 tentative → confirmed 승격 */
export async function promoteHoldsToConfirmed(
  db: QuoteHoldDb,
  quoteId: string,
): Promise<{ updated: number }> {
  const result = await db.mediaBooking.updateMany({
    where: {
      oohQuoteId: quoteId,
      status: MediaBookingStatus.tentative,
    },
    data: { status: MediaBookingStatus.confirmed },
  });
  return { updated: result.count };
}

/** cancel / withdraw 시 활성 홀드 해제 (내역 유지) */
export async function releaseHoldsForQuote(
  db: QuoteHoldDb,
  quoteId: string,
  reason: string,
): Promise<{ updated: number }> {
  const noteSuffix = `\n[released] ${reason.trim() || "released"} @ ${new Date().toISOString()}`;
  const active = await db.mediaBooking.findMany({
    where: {
      oohQuoteId: quoteId,
      status: {
        in: [MediaBookingStatus.tentative, MediaBookingStatus.confirmed],
      },
    },
    select: { id: true, notes: true },
  });

  if (active.length === 0) {
    return { updated: 0 };
  }

  await Promise.all(
    active.map((row) =>
      db.mediaBooking.update({
        where: { id: row.id },
        data: {
          status: MediaBookingStatus.cancelled,
          notes: `${row.notes ?? ""}${noteSuffix}`.slice(0, 2000),
        },
      }),
    ),
  );

  return { updated: active.length };
}

export function isBookingHoldConflictError(
  e: unknown,
): e is BookingHoldConflictError {
  return e instanceof BookingHoldConflictError;
}

export function isQuoteHoldDatesRequiredError(
  e: unknown,
): e is QuoteHoldDatesRequiredError {
  return e instanceof QuoteHoldDatesRequiredError;
}
