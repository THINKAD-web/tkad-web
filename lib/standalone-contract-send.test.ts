import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import {
  buildStandaloneOoHQuoteCreateData,
  STANDALONE_OOH_SOURCE_NOTE,
} from "@/lib/standalone-contract-send";

describe("standalone-contract-send", () => {
  it("buildStandaloneOoHQuoteCreateData sets booking_confirmed and pending contract", () => {
    const data = buildStandaloneOoHQuoteCreateData({
      clientCompany: "Acme",
      clientName: "Kim",
      clientRepName: "",
      clientAddress: "",
      clientPhone: "",
      campaignName: "Test",
      productionCost: "",
      mediaCount: "1기",
      paymentMethod: "",
      clientEmail: "kim@acme.co",
      mediaLines: ["Media A"],
      period: "2026-01-01 ~ 2026-01-31",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      totalAmountManwon: 100,
      specialTerms: null,
      locale: "ko",
      download: false,
      mediaIds: ["media-1"],
    });

    assert.equal(data.status, OoHQuoteStatus.booking_confirmed);
    assert.equal(data.clientEmail, "kim@acme.co");
    assert.ok(data.adminNote?.includes(STANDALONE_OOH_SOURCE_NOTE));
    assert.equal(data.oohContract?.create?.status, OohContractStatus.pending);
    assert.deepEqual(data.mediaIds, ["media-1"]);
  });
});
