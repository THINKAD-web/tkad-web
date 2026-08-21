import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlannerReportExportPayload } from "../planner-report-export/types";
import {
  dispatchInquiryAutoProposalSend,
  type InquiryAutoProposalSendEmailArgs,
} from "./send-proposal";
import { extractEmailsFromText } from "./test-send-allowlist";
import type { ProposalOption } from "./match-and-options";

const PILOT_TEXT = `인천공항 지정 매체:
- 인천공항 국제선 T1 키로뷰 광고
From: Doris <doris@yidu.com>
예산 3,000만원
기간 1개월
`;

const stubOption: ProposalOption = {
  optionId: "single:media_t1",
  kind: "single",
  mediaIds: ["media_t1"],
  names: ["인천공항 국제선 T1 키로뷰 광고"],
  monthlyWon: 12_000_000,
  sellingUnitFollowUp: false,
};

function stubPayload(): PlannerReportExportPayload {
  return { title: "stub" } as PlannerReportExportPayload;
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
    {
      text: PILOT_TEXT,
      optionId: stubOption.optionId,
      to: "doris@yidu.com",
    },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: async () => {
        sendCalls += 1;
        throw new Error("SEND_MUST_NOT_BE_CALLED");
      },
      buildForOption: async () => {
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
    {
      text: PILOT_TEXT,
      optionId: stubOption.optionId,
      to: fromBody[0]!,
    },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: explodingSend(),
      buildForOption: async () => {
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
    {
      text: PILOT_TEXT,
      optionId: stubOption.optionId,
      to: "ops@tkad.co.kr",
    },
    {
      isEmailConfigured: () => true,
      sendEmailWithPdfAttachment: async (args) => {
        sent.push(args);
      },
      buildForOption: async () => ({
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
          eligible: [],
          excluded: [],
          options: [stubOption],
        },
        option: stubOption,
        payload: stubPayload(),
      }),
      buildPdf: async () => Buffer.from("%PDF-stub"),
    },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.to, "ops@tkad.co.kr");
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.to, "ops@tkad.co.kr");
  assert.notEqual(sent[0]?.to, "doris@yidu.com");
});
