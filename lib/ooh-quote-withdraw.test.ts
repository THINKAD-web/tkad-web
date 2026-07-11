import assert from "node:assert/strict";
import { test } from "node:test";
import { OoHQuoteStatus } from "@prisma/client";
import { canProceedBooking, canRequestRevision, canWithdrawProceed } from "@/lib/ooh-quote";
import { oohQuoteStatusToStage } from "@/lib/crm-pipeline-sync";

test("canWithdrawProceed: only booking_requested", () => {
  assert.equal(canWithdrawProceed(OoHQuoteStatus.booking_requested), true);
  assert.equal(canWithdrawProceed(OoHQuoteStatus.sent), false);
  assert.equal(canWithdrawProceed(OoHQuoteStatus.booking_confirmed), false);
  assert.equal(canWithdrawProceed(OoHQuoteStatus.booking_pending), false);
});

test("canRequestRevision: only sent", () => {
  assert.equal(canRequestRevision(OoHQuoteStatus.sent), true);
  assert.equal(canRequestRevision(OoHQuoteStatus.booking_requested), false);
  assert.equal(canRequestRevision(OoHQuoteStatus.booking_confirmed), false);
  assert.equal(canRequestRevision(OoHQuoteStatus.draft), false);
});

test("canProceedBooking and canWithdrawProceed are mutually exclusive", () => {
  const statuses = Object.values(OoHQuoteStatus);
  for (const s of statuses) {
    if (s === OoHQuoteStatus.sent) {
      assert.equal(canProceedBooking(s), true);
      assert.equal(canWithdrawProceed(s), false);
    } else if (s === OoHQuoteStatus.booking_requested) {
      assert.equal(canProceedBooking(s), false);
      assert.equal(canWithdrawProceed(s), true);
    } else {
      assert.equal(canProceedBooking(s), false);
      assert.equal(canWithdrawProceed(s), false);
    }
  }
});

test("oohQuoteStatusToStage: sent is quote_sent after withdraw path", () => {
  assert.equal(oohQuoteStatusToStage("sent"), "quote_sent");
  assert.equal(oohQuoteStatusToStage("booking_requested"), "contract_negotiation");
});
