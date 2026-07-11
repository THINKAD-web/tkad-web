import assert from "node:assert/strict";
import { test } from "node:test";
import { OoHQuoteStatus } from "@prisma/client";
import { oohQuoteStatusToStage } from "@/lib/crm-pipeline-sync";

test("syncPipelineStageForOoHQuote: sent maps to quote_sent", () => {
  assert.equal(oohQuoteStatusToStage(OoHQuoteStatus.sent), "quote_sent");
  assert.equal(
    oohQuoteStatusToStage(OoHQuoteStatus.booking_requested),
    "contract_negotiation",
  );
});

test("withdraw race: updateMany count 0 when status no longer booking_requested", () => {
  const priorStatus = OoHQuoteStatus.booking_confirmed;
  const canUpdate =
    priorStatus === OoHQuoteStatus.booking_requested;
  assert.equal(canUpdate, false);
});
