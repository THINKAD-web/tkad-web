import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOohContractPdf,
  buildSignedOohContractPdf,
  splitArt10And11ForRender,
  splitArticleBodyAtItemBoundaries,
} from "@/lib/ooh-contract-pdf";
import {
  computeKoSignatureSealLayout,
  sealsClearOfTextRows,
} from "@/lib/ooh-contract-signature-layout";
import { CONTRACT_LAYOUT } from "@/lib/contract-layout";
import { standaloneContractToPdfVars } from "@/lib/standalone-contract";
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

test("Korean spectory sample contract stays within compact page count", async () => {
  const { pdfBase64 } = await buildOohContractPdf(KO_VARS);
  const pages = countPdfPages(pdfBase64);
  assert.ok(pages >= 2 && pages <= 4, `unexpected page count ${pages}`);
});

test("Korean 2-media G1-like contract fits on 2 pages", async () => {
  const lines = [
    {
      name: "코엑스 케이팝 스퀘어 전광판 광고",
      location:
        "서울 강남구 영동대로 513 스타필드 코엑스몰 K-POP 광장 (코엑스 아티움 벽면)",
      spec: "81×20",
      unitPriceWon: 100_000_000,
      lineSupplyWon: 100_000_000,
    },
    {
      name: "명동 미디어폴 디지털 광고",
      location: "서울 중구 명동길 255m 구간 명동 미디어폴",
      spec: "1.5×2.5",
      unitPriceWon: 10_000_000,
      lineSupplyWon: 10_000_000,
    },
  ];
  const vars = standaloneContractToPdfVars(
    {
      clientCompany: "싱커드",
      clientName: "홍길동",
      clientRepName: "홍길동",
      clientAddress: "서울",
      clientPhone: "021234567",
      campaignName: "",
      productionCost: "자체제작",
      mediaCount: "2기",
      paymentMethod: "계산서 발행 후 선결제",
      clientEmail: "",
      mediaIds: ["a", "b"],
      mediaLines: lines.map((l) => l.name),
      period: "2026-09-22 ~ 2026-10-21",
      startDate: "2026-09-22",
      endDate: "2026-10-21",
      totalAmountManwon: 10000,
      extraProductionWon: 2_000_000,
      locale: "ko",
      download: false,
    },
    "G1-PAGE-COUNT",
    lines,
  );
  const { pdfBase64 } = await buildOohContractPdf(vars);
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

test("signed contract PDF embeds signature image", async () => {
  const unsigned = await buildOohContractPdf(KO_VARS);
  const unsignedImages = (
    Buffer.from(unsigned.pdfBase64, "base64").toString("latin1").match(
      /\/Subtype \/Image/g,
    ) ?? []
  ).length;
  const { pdfBase64 } = await buildSignedOohContractPdf(
    KO_VARS,
    { signaturePngBase64: TINY_PNG_B64 },
    {
      documentNumber: "DOC-1",
      signerName: "홍길동",
      signerEmail: "test@example.com",
      signedAtIso: "2026-07-08T13:00:00.000Z",
      signedAtKst: "2026. 07. 08. 22:00:00",
      signerIp: "127.0.0.1",
      signerAgent: "test-agent",
      documentContentSha256: "a".repeat(64),
      signatureImageSha256: "b".repeat(64),
    },
  );
  const signedImages = (
    Buffer.from(pdfBase64, "base64").toString("latin1").match(
      /\/Subtype \/Image/g,
    ) ?? []
  ).length;
  assert.ok(signedImages > unsignedImages);
});

test("KO signature seal layout keeps stamps below representative row", () => {
  const boxTop = 200;
  const margin = CONTRACT_LAYOUT.margin;
  const pageInner = 210 - 2 * margin;
  const colW = (pageInner - CONTRACT_LAYOUT.sigColGap) / 2;
  const leftX = margin;
  const rightX = margin + colW + CONTRACT_LAYOUT.sigColGap;
  const textEndY = boxTop + 9 + 4 * CONTRACT_LAYOUT.sigFieldH;

  const layout = computeKoSignatureSealLayout({
    boxTop,
    leftX,
    rightX,
    colW,
    ly: textEndY,
    ry: textEndY,
    hasClientStamp: true,
  });

  assert.ok(sealsClearOfTextRows(layout));
  const repRowY = textEndY - CONTRACT_LAYOUT.sigFieldH;
  assert.ok(layout.partyBStamp.y > repRowY + 1);
  assert.ok(layout.partyAStamp.x < layout.partyBStamp.x);
});

test("signed contract PDF uses same Korean font path", async () => {
  const { pdfBase64 } = await buildSignedOohContractPdf(
    KO_VARS,
    { signaturePngBase64: TINY_PNG_B64 },
    {
      documentNumber: "DOC-1",
      signerName: "홍길동",
      signerEmail: "test@example.com",
      signedAtIso: "2026-07-08T13:00:00.000Z",
      signedAtKst: "2026. 07. 08. 22:00:00",
      signerIp: "127.0.0.1",
      signerAgent: "test-agent",
      documentContentSha256: "a".repeat(64),
      signatureImageSha256: "b".repeat(64),
    },
  );
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("NotoSansKR"), true);
});

test("제7조 본문은 항 번호 경계에서만 분할된다", () => {
  const art7 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.includes("계약의중도해지"),
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

test("제10·11조는 템플릿에서 별도 article 섹션", () => {
  const art10 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.startsWith("제10조"),
  );
  const art11 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.startsWith("제11조"),
  );
  assert.ok(art10);
  assert.ok(art11);
  assert.match(art10!.paragraphs[0]!, /기명날인/);
  assert.match(art11!.paragraphs[0]!, /효력이 발생한다/);
  const legacy =
    '제10조 (재판관할) 1) … 보관한다. 제11조 (효력발생) 1) 본 계약은 계약체결일로부터 효력이 발생한다.';
  const parts = splitArt10And11ForRender(legacy);
  assert.equal(parts.length, 2);
});
