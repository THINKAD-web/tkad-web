import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { buildOohContractPdf } from "../lib/ooh-contract-pdf.ts";
import { buildBillingDocumentPdfBase64 } from "../lib/server-ooh-quote-pdf.ts";
import { buildContractMoney } from "../lib/contract-money.ts";
import {
  formatContractAmountKorean,
  formatContractAdUnitPriceDisplay,
} from "../lib/ooh-contract-format.ts";

const out = "reports/contract-quality-2026-09-22";
mkdirSync(out, { recursive: true });

const refPdf =
  "/Users/ijaehan/Downloads/(260918)_기어세컨드 홍대 상진빌딩 계약서_싱커드.pdf";
try {
  copyFileSync(refPdf, `${out}/reference-original.pdf`);
} catch {
  /* optional on CI */
}

/** 원본 PDF(260918 기어세컨드·홍대 상진빌딩) 동일 조건 */
const mediaSupplyWon = 15_000_000;
const money = buildContractMoney({
  mediaSupplyWon,
  extraProductionWon: 0,
  extraInstallWon: 0,
  extraOtherWon: 0,
});

const contract = await buildOohContractPdf({
  isKo: true,
  contractId: "GEAR-SECOND-260918",
  clientCompany: "㈜기어세컨드",
  clientRepName: "김 민 상",
  clientAddress: "서울특별시 성동구 성수이로 62",
  clientPhone: "02-718-6348",
  campaignName: "홍대 상진빌딩 빌딩 전광판광고",
  periodStart: "2026년 9월 27일",
  periodEnd: "2026년 10월 26일",
  periodMonths: "1개월",
  productionCost:
    "광고주 직접 제작 – 9월21일 오전까지 sales@tkad.co.kr로 전달",
  mediaCount: "1구좌 (30초) – 1일 100회 이상 송출",
  totalAmount: `￦ ${money.totalWon.toLocaleString("ko-KR")}(VAT포함)`,
  amountKorean: formatContractAmountKorean(money.totalWon),
  paymentMethod: "계약서 작성 후 세금계산서 발행 및 9월 22일 이내 선입금",
  contractDate: "2026년 9월 18일",
  adUnitPriceDisplay: formatContractAdUnitPriceDisplay(mediaSupplyWon),
  otherNotes: "",
  mediaLineItems: [
    {
      name: "홍대 상진빌딩 전광판",
      spec: "홍대 · 상진빌딩",
      unitPriceWon: mediaSupplyWon,
      lineSupplyWon: mediaSupplyWon,
    },
  ],
  costLines: [],
});
writeFileSync(`${out}/contract.pdf`, Buffer.from(contract.pdfBase64, "base64"));

const shared = {
  isKo: true,
  clientName: "김민상",
  company: "㈜기어세컨드",
  period: "2026-09-27 ~ 2026-10-26",
  lines: [
    {
      name: "홍대 상진빌딩 전광판",
      spec: "홍대",
      amountWon: mediaSupplyWon,
    },
  ],
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
