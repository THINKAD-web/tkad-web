import { createHash } from "node:crypto";
import type { SignatureAuditLog } from "@prisma/client";
import {
  buildOohContractPdf,
  type OohContractPdfVars,
} from "@/lib/ooh-contract-pdf";

export function sha256Hex(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha256").update(buf).digest("hex");
}

/** 서명 직전 계약서 본문(미서명 PDF) SHA-256 */
export async function hashUnsignedContractDocument(
  vars: OohContractPdfVars,
): Promise<string> {
  const { pdfBase64 } = await buildOohContractPdf(vars);
  return sha256Hex(Buffer.from(pdfBase64, "base64"));
}

/** 서명 이미지(PNG base64) SHA-256 */
export function hashSignatureImagePngBase64(signaturePngBase64: string): string {
  const raw = signaturePngBase64.includes(",")
    ? signaturePngBase64.split(",")[1]!
    : signaturePngBase64;
  return sha256Hex(Buffer.from(raw, "base64"));
}

export function formatSignedAtKst(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export type SignatureAuditSummary = {
  documentNumber: string;
  signerName: string;
  signerEmail: string;
  signedAtKst: string;
  signerIp: string;
  documentHash: string;
  signatureImageHash: string;
  signedPdfSha256: string;
};

export function auditLogToSummary(
  log: SignatureAuditLog,
  input: { signerName: string; signedPdfSha256: string },
): SignatureAuditSummary {
  return {
    documentNumber: log.contractId,
    signerName: input.signerName,
    signerEmail: log.signerEmail,
    signedAtKst: formatSignedAtKst(log.signedAt),
    signerIp: log.signerIp,
    documentHash: log.documentHash,
    signatureImageHash: log.signatureImageHash,
    signedPdfSha256: input.signedPdfSha256,
  };
}

export function buildContractSignAuditEmail(params: {
  isKo: boolean;
  summary: SignatureAuditSummary;
}): { subject: string; text: string; html: string } {
  const s = params.summary;
  if (params.isKo) {
    const subject = `[싱커드] 전자계약 서명 완료 — 문서 ${s.documentNumber.slice(0, 8)}`;
    const text = [
      "전자계약 서명이 완료되었습니다. 첨부 PDF는 서명이 반영된 계약서입니다.",
      "",
      "— 감사 로그 요약 —",
      `문서 고유번호: ${s.documentNumber}`,
      `서명자: ${s.signerName} <${s.signerEmail}>`,
      `서명 일시(KST): ${s.signedAtKst}`,
      `IP 주소: ${s.signerIp}`,
      `계약서 내용 해시(SHA-256): ${s.documentHash}`,
      `서명 이미지 해시(SHA-256): ${s.signatureImageHash}`,
      `서명 완료 PDF 해시(SHA-256): ${s.signedPdfSha256}`,
      "",
      "본 문서는 전자서명법에 따른 전자서명이 적용되었습니다.",
    ].join("\n");
    const html = `
<p>전자계약 서명이 완료되었습니다. 첨부 PDF는 서명이 반영된 계약서입니다.</p>
<h3 style="font-size:14px;margin:16px 0 8px">감사 로그 요약</h3>
<table style="border-collapse:collapse;font-size:13px">
<tr><td style="padding:4px 12px 4px 0;color:#666">문서 고유번호</td><td><code>${s.documentNumber}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">서명자</td><td>${s.signerName} &lt;${s.signerEmail}&gt;</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">서명 일시(KST)</td><td>${s.signedAtKst}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">IP 주소</td><td>${s.signerIp}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">계약서 내용 해시</td><td><code style="word-break:break-all">${s.documentHash}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">서명 이미지 해시</td><td><code style="word-break:break-all">${s.signatureImageHash}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">서명 PDF 해시</td><td><code style="word-break:break-all">${s.signedPdfSha256}</code></td></tr>
</table>
<p style="margin-top:16px;font-size:12px;color:#444">본 문서는 「전자서명법」에 따른 전자서명이 적용되었습니다.</p>`;
    return { subject, text, html };
  }

  const subject = `[THINKAD] E-contract signed — ${s.documentNumber.slice(0, 8)}`;
  const text = [
    "The e-contract has been signed. The attached PDF is the executed agreement.",
    "",
    "— Audit summary —",
    `Document ID: ${s.documentNumber}`,
    `Signer: ${s.signerName} <${s.signerEmail}>`,
    `Signed at (KST): ${s.signedAtKst}`,
    `IP: ${s.signerIp}`,
    `Document content SHA-256: ${s.documentHash}`,
    `Signature image SHA-256: ${s.signatureImageHash}`,
    `Signed PDF SHA-256: ${s.signedPdfSha256}`,
  ].join("\n");
  const html = `
<p>The e-contract has been signed. See the attached PDF.</p>
<h3 style="font-size:14px;margin:16px 0 8px">Audit summary</h3>
<table style="border-collapse:collapse;font-size:13px">
<tr><td style="padding:4px 12px 4px 0;color:#666">Document ID</td><td><code>${s.documentNumber}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Signer</td><td>${s.signerName} &lt;${s.signerEmail}&gt;</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Signed (KST)</td><td>${s.signedAtKst}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">IP</td><td>${s.signerIp}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Document SHA-256</td><td><code style="word-break:break-all">${s.documentHash}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Signature SHA-256</td><td><code style="word-break:break-all">${s.signatureImageHash}</code></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">PDF SHA-256</td><td><code style="word-break:break-all">${s.signedPdfSha256}</code></td></tr>
</table>`;
  return { subject, text, html };
}
