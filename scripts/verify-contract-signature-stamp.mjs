import { mkdirSync, writeFileSync } from "node:fs";
import { buildSignedOohContractPdf } from "../lib/ooh-contract-pdf.ts";
import { OOH_CONTRACT_TEMPLATE_SAMPLE_VARS } from "../lib/ooh-contract-template-ko.ts";
import { loadQuoteStampDataUrl } from "../lib/quote-pdf-assets.ts";

const outDir = "reports/contract-stamp-verify";
mkdirSync(outDir, { recursive: true });

const KO_VARS = {
  isKo: true,
  contractId: "STAMP-VERIFY",
  ...OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
};

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const clientStamp = loadQuoteStampDataUrl();

const { pdfBase64 } = await buildSignedOohContractPdf(
  KO_VARS,
  {
    signaturePngBase64: TINY_PNG,
    clientStampDataUrl: clientStamp,
  },
  {
    documentNumber: "STAMP-VERIFY",
    signerName: "홍용기",
    signerEmail: "mannote@naver.com",
    signedAtIso: new Date().toISOString(),
    signedAtKst: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    signerIp: "127.0.0.1",
    signerAgent: "verify-contract-signature-stamp.mjs",
    documentContentSha256: "c".repeat(64),
    signatureImageSha256: "d".repeat(64),
  },
);

writeFileSync(`${outDir}/signed-with-stamp.pdf`, Buffer.from(pdfBase64, "base64"));
console.log(`Wrote ${outDir}/signed-with-stamp.pdf`);
