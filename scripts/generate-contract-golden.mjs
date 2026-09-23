/**
 * G1/G2 PDF — production builders (buildOohContractPdf / buildBillingDocumentPdfBase64).
 * Not an admin browser session. Path label: script → same server PDF functions.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildContractMoney } from "../lib/contract-money.ts";
import { buildOohContractPdf } from "../lib/ooh-contract-pdf.ts";
import { buildBillingDocumentPdfBase64 } from "../lib/server-ooh-quote-pdf.ts";
import { formatContractCampaignName } from "../lib/ooh-contract-format.ts";

const out = "reports/contract-golden-2026-09-22";
mkdirSync(out, { recursive: true });

function varsFromMoney(id, money, extra) {
  return {
    isKo: true,
    contractId: id,
    clientCompany: extra.company,
    clientRepName: extra.rep,
    clientAddress: extra.address,
    clientPhone: "010-6432-5577",
    campaignName: extra.campaignName,
    periodStart: "2026년 9월 22일",
    periodEnd: "2026년 10월 21일",
    periodMonths: "1개월",
    productionCost: extra.productionCost,
    mediaCount: extra.mediaCount,
    totalAmount: money.totalAmountDisplay,
    amountKorean: money.amountKorean,
    paymentMethod: "계산서 발행 후 선결제",
    contractDate: "2026년 9월 22일",
    mediaLines: money.mediaLines.map((l) => l.name),
    mediaLineItems: money.mediaLines.map((l) => ({
      name: l.name,
      location: l.location,
      spec: l.spec,
      unitPriceWon: l.supplyWon,
      lineSupplyWon: l.supplyWon,
    })),
    costLines: [
      { label: "제작비", amountWon: money.extraProductionWon },
      { label: "설치비", amountWon: money.extraInstallWon },
      { label: "기타 비용", amountWon: money.extraOtherWon },
    ],
    adUnitPriceDisplay: money.adUnitPriceDisplay,
    otherNotes: extra.otherNotes,
    contractMoney: money,
  };
}

const g1 = buildContractMoney({
  mediaLines: [
    {
      name: "코엑스 케이팝 스퀘어",
      location: "서울 강남구 영동대로 513",
      spec: "대형 LED",
      supplyWon: 100_000_000,
    },
    {
      name: "명동 미디어폴",
      location: "서울 중구 명동길",
      spec: "폴형 LED",
      supplyWon: 10_000_000,
    },
  ],
  contractMediaSupplyWon: 100_000_000,
  extraProductionWon: 2_000_000,
  productionCostText: "제작비",
});

const g2 = buildContractMoney({
  mediaLines: [
    {
      name: "홍대 상진빌딩",
      location: "서울 마포구",
      spec: "전광판",
      supplyWon: 15_000_000,
    },
  ],
  contractMediaSupplyWon: 15_000_000,
  extraProductionWon: 0,
  productionCostText:
    "광고주 직접 제작 – 9월21일 오전까지 sales@tkad.co.kr로 전달",
});

if (g1.totalWon !== 112_200_000) {
  throw new Error(`G1 total ${g1.totalWon}`);
}

const g1Pdf = await buildOohContractPdf(
  varsFromMoney("G1", g1, {
    company: "(주)기어세컨드",
    rep: "김대표",
    address: "서울특별시 마포구",
    campaignName: formatContractCampaignName(
      ["코엑스 케이팝 스퀘어", "명동 미디어폴"],
      "",
    ),
    productionCost: "제작비",
    mediaCount: "2기",
    otherNotes: "특약에 } 포함 테스트",
  }),
);
const g2Pdf = await buildOohContractPdf(
  varsFromMoney("G2", g2, {
    company: "(주)기어세컨드",
    rep: "김대표",
    address: "서울특별시 마포구",
    campaignName: "홍대 상진빌딩 광고",
    productionCost:
      "광고주 직접 제작 – 9월21일 오전까지 sales@tkad.co.kr로 전달",
    mediaCount: "1기",
    otherNotes: "",
  }),
);

const invoice = await buildBillingDocumentPdfBase64({
  isKo: true,
  kind: "invoice",
  clientName: "김대표",
  company: "(주)기어세컨드",
  period: "2026-09-22 ~ 2026-10-21",
  lines: g1.mediaLines.map((l) => ({
    name: l.name,
    spec: l.location,
    amountWon: l.supplyWon,
  })),
  extraLines: [
    { name: "협의 조정", amountWon: g1.adjustmentWon },
    { name: "제작비", amountWon: g1.extraProductionWon },
  ],
  supplyWon: g1.supplyWon,
  vatWon: g1.vatWon,
  totalWon: g1.totalWon,
  bankName: "국민은행",
  bankAccount: "000-00-000000",
  bankHolder: "(주)싱커드",
});

const summary = await buildBillingDocumentPdfBase64({
  isKo: true,
  kind: "summary",
  clientName: "김대표",
  company: "(주)기어세컨드",
  period: "2026-09-22 ~ 2026-10-21",
  lines: g1.mediaLines.map((l) => ({
    name: l.name,
    spec: l.location,
    amountWon: l.supplyWon,
  })),
  extraLines: [
    { name: "협의 조정", amountWon: g1.adjustmentWon },
    { name: "제작비", amountWon: g1.extraProductionWon },
  ],
  supplyWon: g1.supplyWon,
  vatWon: g1.vatWon,
  totalWon: g1.totalWon,
});

writeFileSync(`${out}/g1-contract.pdf`, Buffer.from(g1Pdf.pdfBase64, "base64"));
writeFileSync(`${out}/g2-contract.pdf`, Buffer.from(g2Pdf.pdfBase64, "base64"));
writeFileSync(`${out}/g1-invoice.pdf`, Buffer.from(invoice, "base64"));
writeFileSync(`${out}/g1-summary.pdf`, Buffer.from(summary, "base64"));
writeFileSync(
  `${out}/totals.json`,
  JSON.stringify(
    {
      source: "script calling buildOohContractPdf and buildBillingDocumentPdfBase64 (not a logged-in admin browser preview)",
      g1TotalWon: g1.totalWon,
      g1AmountKorean: g1.amountKorean,
      g1Display: g1.totalAmountDisplay,
      invoiceTotalWon: g1.totalWon,
      summaryTotalWon: g1.totalWon,
    },
    null,
    2,
  ),
);
console.log("golden", g1.totalWon, g1.amountKorean);
