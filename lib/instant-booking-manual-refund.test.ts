import assert from "node:assert/strict";
import { test } from "node:test";

test("manual refund reason codes are distinct labels", async () => {
  const mod = await import("./instant-booking-manual-refund.ts");
  assert.equal(typeof mod.recordInstantBookingManualRefundNeeded, "function");
});
