/**
 * 매체 예약(MediaBooking) 충돌 감지 헬퍼.
 *
 * 정책:
 *   - 차단 대상 status: tentative + confirmed (= "활성 슬롯")
 *   - 제외 대상 status: requested (운영자 검토 전), cancelled, expired
 *   - 동일 매체 + 시간 범위 오버랩 시 충돌
 *
 * 오버랩 판정:
 *   기존 [a.start, a.end), 신규 [b.start, b.end) 가 겹치는 조건은
 *     a.start < b.end && a.end > b.start
 *   양 끝점이 정확히 맞물리는 경우(연속 예약)는 충돌로 보지 않음.
 *
 * 주의: 이 헬퍼는 *순수 조회*만 수행. 호출자(API 라우트)가 응답·강제 등록 정책을 결정.
 */

import type { MediaBooking, Prisma, PrismaClient } from "@prisma/client";

/** 충돌 판정에 포함되는 status — UI 와 동기화 필요 */
export const CONFLICT_BLOCKING_STATUSES = ["tentative", "confirmed"] as const;
export type ConflictBlockingStatus = (typeof CONFLICT_BLOCKING_STATUSES)[number];

/** PrismaClient 또는 트랜잭션 클라이언트 */
export type BookingConflictDb = {
  mediaBooking: PrismaClient["mediaBooking"];
};

export type ConflictCheckParams = {
  mediaId: string;
  startsAt: Date;
  endsAt: Date;
  /** 자기 자신은 충돌 판정에서 제외 (PATCH 시 사용) */
  excludeBookingId?: string;
  /** 동일 OoH 견적의 기존 홀드는 충돌에서 제외 (재시도·idempotent) */
  excludeOohQuoteId?: string;
};

/**
 * 동일 매체에서 [startsAt, endsAt) 와 시간상 오버랩되는 활성 예약 목록 반환.
 * 빈 배열이면 충돌 없음.
 */
export async function findConflictingBookings(
  db: BookingConflictDb,
  {
    mediaId,
    startsAt,
    endsAt,
    excludeBookingId,
    excludeOohQuoteId,
  }: ConflictCheckParams,
): Promise<MediaBooking[]> {
  if (!(startsAt instanceof Date) || !(endsAt instanceof Date)) {
    throw new Error("startsAt / endsAt 는 Date 객체여야 합니다.");
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("startsAt / endsAt 가 유효하지 않습니다.");
  }
  if (endsAt <= startsAt) {
    throw new Error("endsAt 는 startsAt 보다 커야 합니다.");
  }

  const notFilters: Prisma.MediaBookingWhereInput[] = [];
  if (excludeBookingId) notFilters.push({ id: excludeBookingId });
  if (excludeOohQuoteId) notFilters.push({ oohQuoteId: excludeOohQuoteId });

  return db.mediaBooking.findMany({
    where: {
      mediaId,
      status: { in: [...CONFLICT_BLOCKING_STATUSES] },
      // a.start < b.end && a.end > b.start
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(notFilters.length > 0 ? { NOT: notFilters } : {}),
    },
    orderBy: { startsAt: "asc" },
  });
}

/** 충돌 booking 을 사람이 읽기 쉬운 짧은 라인으로 요약 (운영자 알림용) */
export function summarizeConflict(b: MediaBooking, locale: "ko" | "en" = "ko"): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  const span = `${fmt(b.startsAt)} → ${fmt(b.endsAt)}`;
  return locale === "ko"
    ? `${b.title} · ${span} (${b.status})`
    : `${b.title} · ${span} (${b.status})`;
}
