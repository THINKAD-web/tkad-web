import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlannerReportExportPayload } from "../planner-report-export/types";
import {
  dispatchInquiryAutoProposalSend,
  type InquiryAutoProposalSendEmailArgs,
} from "./send-proposal";
import { extractEmailsFromText } from "./test-send-allowlist";
import type { InquiryAutoProposalBuild } from "./run-dry-run";

const PILOT_TEXT = `인천공항 지정 매체:
- 인천공항 국제선 T1 키로뷰 광고
From: Doris <doris@yidu.com>
예산 3,000만원
기간 1개월
`;

function stubBuild(): InquiryAutoProposalBuild {
  return {
    dryRun: {
      parsed: {
        raw: PILOT_TEXT,
        budgetWon: 30_000_000,
        budgetAssumed: false,
        months: 1,
        wantsAirport: true,
        wantsRestStopLed: false,
        namedNeedles: [],
      },
      matched: [],
      eligible: [
        {
          id: "t1",
          name: "인천공항 국제선 T1 키로뷰 광고",
          monthlyWon: 12_000_000,
          matchKind: "named",
          eligible: true,
          reasons: [],
          sellingUnitUndeclared: false,
          cpmWon: 5455,
          mediaClass: "dooh_airport",
        },
      ],
      excluded: [],
      brief: {
        budgetInputWon: 30_000_000,
        budgetMode: "total",
        regionCodes: [],
        genders: [],
        ageBands: [],
        goal: null,
        industry: null,
        flightStart: "2026-09-01",
        flightEnd: "2026-09-30",
        freeText: PILOT_TEXT,
      },
      mixUnits: { t1: 1 },
    },
    snapshot: {
      engineVersion: "test",
      brief: {
        budgetWon: 30_000_000,
        regionCodes: [],
        flightStart: "2026-09-01",
        flightEnd: "2026-09-30",
      },
      mediaMix: [],
      metrics: {
        netReach: 0,
        targetPopulation: 0,
        reachRate: 0,
        frequency: 0,
        grp: 0,
        effectiveReach: 0,
        effectiveReachRate: 0,
        totalImpressions: 0,
        mixCpmWon: null,
        totalCostWon: 0,
        dataQuality: {
          totalCostWon: "measured",
          totalImpressions: "derived",
          mixCpmWon: null,
          netReach: null,
          reachRate: null,
          frequency: null,
          grp: null,
        },
      },
    },
    payload: { title: "stub" } as unknown as PlannerReportExportPayload,
  };
}

function explodingSend() {
  return async (_args: InquiryAutoProposalSendEmailArgs) => {
    throw new Error("SEND_MUST_NOT_BE_CALLED");
  };
}

test("customer To doris@yidu.com is rejected before send even when email is configured", async () => {
  let sendCalls = 0;
  let buildCalls = 0;
  const result = await dispatchInquiryAutoProposalSend(
    { text: PILOT_TEXT, to: "doris@yidu.com" },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: async () => {
        sendCalls += 1;
        throw new Error("SEND_MUST_NOT_BE_CALLED");
      },
      buildProposal: async () => {
        buildCalls += 1;
        throw new Error("BUILD_MUST_NOT_BE_CALLED");
      },
      buildPdf: async () => {
        throw new Error("PDF_MUST_NOT_BE_CALLED");
      },
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "not_test_allowlist");
    assert.equal(result.httpStatus, 400);
  }
  assert.equal(sendCalls, 0);
  assert.equal(buildCalls, 0);
});

test("inquiry From is never used as To — extracted customer email is still rejected before send", async () => {
  const fromBody = extractEmailsFromText(PILOT_TEXT);
  assert.deepEqual(fromBody, ["doris@yidu.com"]);

  const result = await dispatchInquiryAutoProposalSend(
    { text: PILOT_TEXT, to: fromBody[0]! },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: explodingSend(),
      buildProposal: async () => {
        throw new Error("BUILD_MUST_NOT_BE_CALLED");
      },
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "not_test_allowlist");
});

test("allowlisted To reaches send with the allowlisted address only", async () => {
  const sent: InquiryAutoProposalSendEmailArgs[] = [];
  const result = await dispatchInquiryAutoProposalSend(
    { text: PILOT_TEXT, to: "ops@tkad.co.kr" },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: async (args) => {
        sent.push(args);
      },
      buildProposal: async () => stubBuild(),
      buildPdf: async () => Buffer.from("%PDF-stub"),
    },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.to, "ops@tkad.co.kr");
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.to, "ops@tkad.co.kr");
  assert.notEqual(sent[0]?.to, "doris@yidu.com");
});
