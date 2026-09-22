import assert from "node:assert/strict";
import test from "node:test";
import { buildContractInviteEmail } from "@/lib/contract-invite-email";
import { splitPdfLogicalLines } from "@/lib/pdf-line-break";

test("buildContractInviteEmail includes contract summary and contact", () => {
  const mail = buildContractInviteEmail({
    isKo: true,
    clientName: "홍길동",
    contractUrl: "https://thinkad.kr/ko/quote/abc/contract",
    issuerCompany: "(주)싱커드",
    accountManagerName: "김담당",
    mediaNames: ["강남 LED"],
    amountLabel: "₩ 1,000,000원 (VAT포함)",
    period: "2026-07-01 ~ 2026-07-31",
    contactEmail: "sales@thinkad.kr",
    contactPhone: "02-515-2772",
  });
  assert.match(mail.text, /계약 매체/);
  assert.match(mail.text, /강남 LED/);
  assert.match(mail.text, /김담당/);
  assert.match(mail.text, /sales@thinkad.kr/);
  assert.match(mail.html, /싱커드/);
});

test("splitPdfLogicalLines expands literal backslash-n", () => {
  assert.deepEqual(splitPdfLogicalLines("a\\nb"), ["a", "b"]);
});
