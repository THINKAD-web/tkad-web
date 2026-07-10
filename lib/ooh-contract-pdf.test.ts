import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOohContractPdf,
  buildSignedOohContractPdf,
  splitArt10And11ForRender,
  splitArticleBodyAtItemBoundaries,
} from "@/lib/ooh-contract-pdf";
import {
  OOH_CONTRACT_TEMPLATE_KO_ARTICLES,
  OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
} from "@/lib/ooh-contract-template-ko";

const KO_VARS = {
  isKo: true,
  contractId: "TEST-CONTRACT-KO",
  ...OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
} as const;

const EN_VARS = {
  isKo: false,
  contractId: "TEST-CONTRACT-EN",
  clientCompany: "Test Co.",
  clientRepName: "Jane Kim",
  clientAddress: "Seoul",
  clientPhone: "010-0000-0000",
  campaignName: "Test campaign",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  periodMonths: "1 month",
  productionCost: "In-house",
  mediaCount: "1",
  totalAmount: "₩ 5,500,000 (VAT included)",
  amountKorean: "오백오십만원정",
  paymentMethod: "Prepay",
  contractDate: "July 8, 2026",
  advertiserLine: "Test Co. (Jane Doe)",
  mediaLines: ["Gangnam LED"],
  period: "2026-07-01 ~ 2026-07-31",
  amountLine: "Total ad spend (excl. VAT, 10K KRW): ₩5,000",
  specialTerms: null,
} as const;

/** 1×1 transparent PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function countPdfPages(pdfBase64: string): number {
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  return (latin.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

test("Korean spectory sample contract fits exactly 2 pages", async () => {
  const { pdfBase64 } = await buildOohContractPdf(KO_VARS);
  assert.equal(countPdfPages(pdfBase64), 2);
});

test("Korean contract PDF embeds NotoSansKR", async () => {
  const { pdfBase64 } = await buildOohContractPdf(KO_VARS);
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), true);
  assert.equal(latin.includes("Identity-H"), true);
});

test("Korean contract template fills 11-clause body", async () => {
  const { buildOohContractKoTemplate } = await import(
    "@/lib/ooh-contract-template-ko"
  );
  const doc = buildOohContractKoTemplate(KO_VARS);
  const all = doc.sections.flatMap((s) => s.paragraphs).join("\n");
  assert.match(all, /제11조 \(효력발생\)/);
  assert.match(all, /이백일십오만육천원정/);
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

test("제7조 본문은 항 번호 경계에서만 분할된다", () => {
  const art7 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.startsWith("제7조"),
  );
  assert.ok(art7);
  const para = art7!.paragraphs[0]!;
  const body = para.replace(/^제\d+조\s*\([^)]+\)\s*/, "");
  const chunks = splitArticleBodyAtItemBoundaries(body);
  assert.ok(chunks.length >= 6);
  assert.match(chunks[0]!, /한다\.$/);
  assert.match(chunks[1]!, /^1\)/);
  assert.match(chunks[chunks.length - 1]!, /^\(2\)/);
  for (const chunk of chunks.slice(1)) {
    assert.match(chunk, /^(\d+\)|\(\d+\))/);
  }
});

test("제10·11조 PDF 분리는 원문 마커를 유지한다", () => {
  const art = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.includes("제11조"),
  );
  assert.ok(art);
  const para = art!.paragraphs[0]!;
  const parts = splitArt10And11ForRender(para);
  assert.equal(parts.length, 2);
  assert.match(parts[0]!, /제10조 \(재판관할\)/);
  assert.match(parts[0]!, /보관한다\.$/);
  assert.match(parts[1]!, /^제11조 \(효력발생\)/);
  assert.equal(parts.join(" "), para);
});
