import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isQuoteTimelineStepDone,
  quoteStatusLevel,
  resolveQuoteTimelineCurrentStep,
} from "@/lib/quote-status-timeline";

test("resolveQuoteTimelineCurrentStep: sent does not highlight booking", () => {
  assert.equal(resolveQuoteTimelineCurrentStep("sent", false), null);
  assert.equal(
    resolveQuoteTimelineCurrentStep("booking_requested", false),
    "booking",
  );
});

test("quote sent: quote milestone done, booking not current", () => {
  const level = quoteStatusLevel("sent");
  assert.equal(isQuoteTimelineStepDone("quote", level, false), true);
  assert.equal(isQuoteTimelineStepDone("booking", level, false), false);
  assert.equal(resolveQuoteTimelineCurrentStep("sent", false), null);
});

test("booking_confirmed without signature highlights esign", () => {
  assert.equal(resolveQuoteTimelineCurrentStep("booking_confirmed", false), "esign");
  assert.equal(resolveQuoteTimelineCurrentStep("booking_confirmed", true), "invoice");
});
