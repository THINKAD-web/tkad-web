import assert from "node:assert/strict";
import test from "node:test";
import { buildSimpleContractPdfBase64 } from "@/lib/server-ooh-quote-pdf";

test("simple invoice PDF renders Korean with Noto", async () => {
  const pdfBase64 = await buildSimpleContractPdfBase64({
    isKo: true,
    title: "싱커드 청구서",
    lines: ["청구서", "공급가액(만원): ₩1,000", "입금 계좌: 국민은행"],
  });
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), true);
  assert.equal(latin.includes("청구서"), false);
  assert.match(latin, /Identity-H/);
});

test("simple invoice PDF splits literal newline escapes", async () => {
  const pdfBase64 = await buildSimpleContractPdfBase64({
    isKo: true,
    title: "싱커드 청구서",
    lines: ["광고 기간: 2026-07-01\\n2026-07-31"],
  });
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("\\n"), false);
});
