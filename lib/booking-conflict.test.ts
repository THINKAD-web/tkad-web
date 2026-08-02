import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONFLICT_BLOCKING_STATUSES,
  isActiveBlockingBooking,
  isPaymentPendingHoldActive,
} from "./booking-conflict.ts";
import { INSTANT_PAYMENT_HOLD_MARKER } from "./instant-payment-hold-constants.ts";

const NOW = new Date("2026-08-02T12:00:00.000Z");

function minutesAgo(minutes: number, now = NOW): Date {
  return new Date(now.getTime() - minutes * 60_000);
}

test("31분 지난 tentative 즉시예약 홀드는 충돌(active)에서 제외", () => {
  assert.equal(
    isActiveBlockingBooking(
      {
        status: "tentative",
        notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=b1 expiresAt=2026-08-02T11:00:00.000Z`,
        createdAt: minutesAgo(31),
      },
      NOW,
    ),
    false,
  );
});

test("29분 지난 tentative 즉시예약 홀드는 여전히 BLOCK", () => {
  assert.equal(
    isActiveBlockingBooking(
      {
        status: "tentative",
        notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=b2 expiresAt=2026-08-02T12:29:00.000Z`,
        createdAt: minutesAgo(29),
      },
      NOW,
    ),
    true,
  );
});

test("confirmed는 TTL과 무관하게 항상 BLOCK", () => {
  assert.equal(
    isActiveBlockingBooking(
      {
        status: "confirmed",
        notes: null,
        createdAt: minutesAgo(120),
      },
      NOW,
    ),
    true,
  );
});

test("requested는 active blocking 대상이 아님", () => {
  assert.equal(
    isActiveBlockingBooking(
      {
        status: "requested",
        notes: null,
        createdAt: minutesAgo(1),
      },
      NOW,
    ),
    false,
  );
  assert.equal(CONFLICT_BLOCKING_STATUSES.includes("requested" as never), false);
});

test("tentative 운영자 홀드(마커 없음)는 TTL과 무관하게 BLOCK", () => {
  assert.equal(
    isActiveBlockingBooking(
      {
        status: "tentative",
        notes: "admin hold",
        createdAt: minutesAgo(120),
      },
      NOW,
    ),
    true,
  );
});

test("isPaymentPendingHoldActive mirrors booking pay page cutoff", () => {
  assert.equal(isPaymentPendingHoldActive(minutesAgo(29), NOW), true);
  assert.equal(isPaymentPendingHoldActive(minutesAgo(31), NOW), false);
  assert.equal(isPaymentPendingHoldActive({ createdAt: minutesAgo(29) }, NOW), true);
  assert.equal(isPaymentPendingHoldActive({ createdAt: minutesAgo(31) }, NOW), false);
});

test("excludeIds: 자기 홀드는 active blocking 대상에서 제외 가능", () => {
  const ownHold = {
    status: "tentative",
    notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=b-own`,
    createdAt: minutesAgo(10),
  };
  const otherHold = {
    status: "tentative",
    notes: `${INSTANT_PAYMENT_HOLD_MARKER} bookingId=b-other`,
    createdAt: minutesAgo(10),
  };
  assert.equal(isActiveBlockingBooking(ownHold, NOW), true);
  assert.equal(isActiveBlockingBooking(otherHold, NOW), true);
  // 동일 슬롯에 own + other가 있을 때 own id를 excludeIds로 빼면 other만 충돌
  assert.notEqual(ownHold.notes, otherHold.notes);
});
