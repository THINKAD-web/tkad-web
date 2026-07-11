import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nextAdminAction,
  pipelineException,
  pipelineMilestones,
  statusToStepIndex,
  type OohQuotePipelineRow,
} from "@/lib/ooh-quote-pipeline";

function row(partial: Partial<OohQuotePipelineRow> & Pick<OohQuotePipelineRow, "status">): OohQuotePipelineRow {
  return {
    contractSigned: false,
    ...partial,
  };
}

test("pipelineException: cancelled and expired", () => {
  assert.equal(pipelineException(row({ status: "cancelled" })), "cancelled");
  assert.equal(pipelineException(row({ status: "expired" })), "expired");
  assert.equal(pipelineException(row({ status: "sent" })), null);
});

test("statusToStepIndex: sent is step 1 when quote not yet emailed", () => {
  assert.equal(statusToStepIndex(row({ status: "sent" })), 1);
});

test("statusToStepIndex: booking_confirmed without sign stops at esign", () => {
  assert.equal(
    statusToStepIndex(
      row({
        status: "booking_confirmed",
        bookingConfirmedAt: "2026-01-01T00:00:00.000Z",
      }),
    ),
    4,
  );
});

test("statusToStepIndex: cancelled is inactive", () => {
  assert.equal(statusToStepIndex(row({ status: "cancelled" })), -1);
});

test("nextAdminAction: booking confirm on booking_requested", () => {
  assert.equal(
    nextAdminAction(row({ status: "booking_requested" })),
    "bookingConfirm",
  );
});

test("nextAdminAction: awaiting signature on booking_confirmed", () => {
  assert.equal(
    nextAdminAction(row({ status: "booking_confirmed", contractSigned: false })),
    "awaitingSignature",
  );
});

test("pipelineMilestones: invoice timestamp surfaces", () => {
  const ms = pipelineMilestones(
    row({
      status: "invoice_sent",
      quotePdfSentAt: "2026-01-01T00:00:00.000Z",
      bookingRequestedAt: "2026-01-02T00:00:00.000Z",
      bookingConfirmedAt: "2026-01-03T00:00:00.000Z",
      contractSigned: true,
      invoiceSentAt: "2026-01-04T00:00:00.000Z",
    }),
  );
  assert.equal(ms.find((m) => m.id === "invoice_sent")?.at, "2026-01-04T00:00:00.000Z");
  assert.equal(ms.find((m) => m.id === "payment_confirmed")?.done, false);
});
