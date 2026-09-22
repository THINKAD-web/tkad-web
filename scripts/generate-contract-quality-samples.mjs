import { mkdirSync, writeFileSync } from "node:fs";
import { buildOohContractPdf } from "../lib/ooh-contract-pdf.ts";
import { OOH_CONTRACT_TEMPLATE_SAMPLE_VARS } from "../lib/ooh-contract-template-ko.ts";
import { buildBillingDocumentPdfBase64 } from "../lib/server-ooh-quote-pdf.ts";
import { buildContractMoney, supplyWonFromManwonField } from "../lib/contract-money.ts";

const out = "reports/contract-quality-2026-09-22";
mkdirSync(out, { recursive: true });

const mediaSupply = supplyWonFromManwonField(1650);
const money = buildContractMoney({
  mediaSupplyWon: mediaSupply,
  extraProductionWon: 2_000_000,
  extraInstallWon: 500_000,
  extraOtherWon: 300_000,
});

const contract = await buildOohContractPdf({
  isKo: true,
  contractId: "SAMPLE",
  ...OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
  totalAmount: `₩ ${money.totalWon.toLocaleString("ko-KR")}원 (VAT포함)`,
  mediaLineItems: [
    { name: "강남역 LED", spec: "가로 10m · 강남", unitPriceWon: 10_000_000, lineSupplyWon: 10_000_000 },
    { name: "홍대 빌보드", spec: "세로 6m · 홍대", unitPriceWon: 6_500_000, lineSupplyWon: 6_500_000 },
  ],
  costLines: [
    { label: "제작비", amountWon: 2_000_000 },
    { label: "설치비", amountWon: 500_000 },
    { label: "기타 비용", amountWon: 300_000 },
  ],
});
writeFileSync(`${out}/contract.pdf`, Buffer.from(contract.pdfBase64, "base64"));

const shared = {
  isKo: true,
  clientName: "홍길동",
  company: "(주)스펙토리",
  period: "2026-07-01 ~ 2026-07-31",
  lines: [
    { name: "강남역 LED", spec: "가로 10m", amountWon: 10_000_000 },
    { name: "홍대 빌보드", spec: "세로 6m", amountWon: 6_500_000 },
  ],
  extraLines: [
    { name: "제작비", amountWon: 2_000_000 },
    { name: "설치비", amountWon: 500_000 },
    { name: "기타", amountWon: 300_000 },
  ],
  supplyWon: money.supplyWon,
  vatWon: money.vatWon,
  totalWon: money.totalWon,
  bankName: "국민은행",
  bankAccount: "000000-00-000000",
  bankHolder: "(주)싱커드",
  contactEmail: "sales@thinkad.kr",
  contactPhone: "02-515-2772",
};

writeFileSync(
  `${out}/invoice.pdf`,
  Buffer.from(await buildBillingDocumentPdfBase64({ ...shared, kind: "invoice", dueDate: "2026-09-29" }), "base64"),
);
writeFileSync(
  `${out}/summary.pdf`,
  Buffer.from(await buildBillingDocumentPdfBase64({ ...shared, kind: "summary" }), "base64"),
);
console.log("wrote", out, "totalWon", money.totalWon);
