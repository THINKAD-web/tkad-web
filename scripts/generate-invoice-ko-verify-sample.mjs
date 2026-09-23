import { writeFileSync, mkdirSync } from "node:fs";
import { buildSimpleContractPdfBase64 } from "../lib/server-ooh-quote-pdf.ts";

const outDir = "scripts/.verify-invoice-ko-2026-09-22";
mkdirSync(outDir, { recursive: true });

const pdf = await buildSimpleContractPdfBase64({
  isKo: true,
  title: "싱커드 청구서",
  lines: [
    "청구서",
    "",
    "청구일: 2026-09-22",
    "공급가액(만원): ₩5,500",
    "광고 기간: 2026-07-01\\n2026-07-31",
    "입금 계좌: 국민은행",
  ],
});

writeFileSync(`${outDir}/invoice-sample.pdf`, Buffer.from(pdf, "base64"));
console.log(`Wrote ${outDir}/invoice-sample.pdf`);
