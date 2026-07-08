import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOohContractPdf,
  buildSignedOohContractPdf,
} from "@/lib/ooh-contract-pdf";

const KO_VARS = {
  isKo: true,
  advertiserLine: "주식회사 테스트 (홍길동)",
  mediaLines: ["강남역 LED"],
  period: "2026-07-01 ~ 2026-07-31",
  amountLine: "총 광고 집행 금액(참고, 부가세 별도, 만원): ₩5,000",
  specialTerms: null,
  contractId: "TEST-CONTRACT-KO",
} as const;

const EN_VARS = {
  isKo: false,
  advertiserLine: "Test Co. (Jane Doe)",
  mediaLines: ["Gangnam LED"],
  period: "2026-07-01 ~ 2026-07-31",
  amountLine: "Total ad spend (excl. VAT, 10K KRW): ₩5,000",
  specialTerms: null,
  contractId: "TEST-CONTRACT-EN",
} as const;

/** 1×1 transparent PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("Korean contract PDF embeds NotoSansKR", async () => {
  const { pdfBase64 } = await buildOohContractPdf(KO_VARS);
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), true);
  assert.equal(latin.includes("Identity-H"), true);
});

test("English contract PDF stays on Helvetica (no KR font required)", async () => {
  const { pdfBase64 } = await buildOohContractPdf(EN_VARS);
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), false);
  assert.match(latin, /Helvetica/i);
});

test("signed contract PDF uses same Korean font path", async () => {
  const { pdfBase64 } = await buildSignedOohContractPdf(KO_VARS, TINY_PNG_B64, {
    documentNumber: "DOC-1",
    signerName: "홍길동",
    signerEmail: "test@example.com",
    signedAtIso: "2026-07-08T13:00:00.000Z",
    signedAtKst: "2026. 07. 08. 22:00:00",
    signerIp: "127.0.0.1",
    signerAgent: "test-agent",
    documentContentSha256: "a".repeat(64),
    signatureImageSha256: "b".repeat(64),
  });
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), true);
});
