import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { buildOohContractPdf } from "../lib/ooh-contract-pdf.ts";
import { buildBillingDocumentPdfBase64 } from "../lib/server-ooh-quote-pdf.ts";
import { buildContractMoney } from "../lib/contract-money.ts";
import {
  formatContractAmountKorean,
  formatContractAdUnitPriceDisplay,
  formatContractMediaCount,
} from "../lib/ooh-contract-format.ts";

const out = "reports/contract-quality-2026-09-22";
mkdirSync(out, { recursive: true });

const refPdf =
  "/Users/ijaehan/Downloads/(260918)_기어세컨드 홍대 상진빌딩 계약서_싱커드.pdf";
try {
  copyFileSync(refPdf, `${out}/reference-original.pdf`);
} catch {
  /* optional */
}

/** QA: 매체 2개 + 제작비 2천만 (VAT 포함 총 1.32억) */
const mediaSupplyWon = 100_000_000;
const money = buildContractMoney({
  mediaSupplyWon,
  extraProductionWon: 20_000_000,
  extraInstallWon: 0,
  extraOtherWon: 0,
});

const contract = await buildOohContractPdf({
  isKo: true,
  contractId: "QA-2MEDIA-PROD20M",
  clientCompany: "테스트5",
  clientRepName: "홍길동",
  clientAddress: "서울특별시 강남구",
  clientPhone: "01064325577",
  campaignName: "강남 LED 광고 외 1건",
  periodStart: "2026년 9월 22일",
  periodEnd: "2026년 10월 21일",
  periodMonths: "1개월",
  productionCost: "제작비",
  mediaCount: formatContractMediaCount(2),
  totalAmount: `￦ ${money.totalWon.toLocaleString("ko-KR")}(VAT포함)`,
  amountKorean: formatContractAmountKorean(money.totalWon),
  paymentMethod: "계산서 발행 후 선결제",
  contractDate: "2026년 9월 22일",
  adUnitPriceDisplay: formatContractAdUnitPriceDisplay(mediaSupplyWon),
  otherNotes: "",
  mediaLineItems: [
    {
      name: "강남역 LED",
      spec: "10m×6m · 강남역",
      unitPriceWon: 60_000_000,
      lineSupplyWon: 60_000_000,
    },
    {
      name: "홍대 빌보드",
      spec: "8m×4m · 홍대",
      unitPriceWon: 40_000_000,
      lineSupplyWon: 40_000_000,
    },
  ],
  costLines: [{ label: "제작비", amountWon: money.extraProductionWon }],
});
writeFileSync(`${out}/contract.pdf`, Buffer.from(contract.pdfBase64, "base64"));

const shared = {
  isKo: true,
  clientName: "테스트5",
  company: "테스트5",
  period: "2026-09-22 ~ 2026-10-21",
  lines: [
    { name: "강남역 LED", spec: "강남", amountWon: 60_000_000 },
    { name: "홍대 빌보드", spec: "홍대", amountWon: 40_000_000 },
  ],
  extraLines: [{ name: "제작비", amountWon: 20_000_000 }],
  supplyWon: money.supplyWon,
  vatWon: money.vatWon,
  totalWon: money.totalWon,
  bankName: "국민은행",
  bankAccount: "000000-00-000000",
  bankHolder: "(주)싱커드",
  contactEmail: "sales@tkad.co.kr",
  contactPhone: "02-515-2772",
};

writeFileSync(
  `${out}/invoice.pdf`,
  Buffer.from(
    await buildBillingDocumentPdfBase64({
      ...shared,
      kind: "invoice",
      dueDate: "2026-09-29",
    }),
    "base64",
  ),
);
writeFileSync(
  `${out}/summary.pdf`,
  Buffer.from(
    await buildBillingDocumentPdfBase64({ ...shared, kind: "summary" }),
    "base64",
  ),
);

console.log("wrote", out, "totalWon", money.totalWon);
