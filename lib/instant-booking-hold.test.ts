import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INSTANT_PAYMENT_HOLD_MARKER,
  formatInstantPaymentHoldNotes,
  parseInstantPaymentHoldBookingId,
  instantPaymentHoldExpiresAt,
  INSTANT_PAYMENT_HOLD_TTL_MS,
} from "./instant-booking-hold.ts";
import { isAvailabilityDataSparse } from "./media-availability-coverage.ts";

test("format/parse instant payment hold notes", () => {
  const expires = new Date("2026-07-24T12:30:00.000Z");
  const notes = formatInstantPaymentHoldNotes("booking123", expires);
  assert.ok(notes.includes(INSTANT_PAYMENT_HOLD_MARKER));
  assert.equal(parseInstantPaymentHoldBookingId(notes), "booking123");
  assert.equal(parseInstantPaymentHoldBookingId("plain"), null);
});

test("instantPaymentHoldExpiresAt uses 30m TTL", () => {
  const from = new Date("2026-07-24T12:00:00.000Z");
  const exp = instantPaymentHoldExpiresAt(from);
  assert.equal(exp.getTime() - from.getTime(), INSTANT_PAYMENT_HOLD_TTL_MS);
});

test("isAvailabilityDataSparse: zero blocking rows", () => {
  assert.equal(isAvailabilityDataSparse(0), true);
  assert.equal(isAvailabilityDataSparse(1), false);
  assert.equal(isAvailabilityDataSparse(5), false);
});
