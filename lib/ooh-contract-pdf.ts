import { createHash } from "node:crypto";

export type OohContractPdfVars = {
  isKo: boolean;
  /** 광고주 표기 (회사 + 담당자) */
  advertiserLine: string;
  mediaLines: string[];
  period: string;
  /** 만원 단위 금액 표시용 */
  amountLine: string;
  specialTerms: string | null;
  contractId: string;
};

export type OohContractSignAudit = {
  /** 문서 고유번호 (계약 레코드 ID) */
  documentNumber: string;
  signerName: string;
  signerEmail: string;
  signedAtIso: string;
  signedAtKst: string;
  signerIp: string;
  signerAgent: string;
  /** 서명 직전 계약서 본문 해시 */
  documentContentSha256: string;
  /** 서명 이미지 해시 */
  signatureImageSha256: string;
};

function wrapLines(
  doc: import("jspdf").default,
  text: string,
  maxW: number,
): string[] {
  return doc.splitTextToSize(text, maxW) as string[];
}

export async function buildOohContractPdf(
  vars: OohContractPdfVars,
  options?: {
    signaturePngBase64?: string;
    audit?: OohContractSignAudit;
  },
): Promise<{ pdfBase64: string; sha256: string }> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 2 * margin;
  let y = 18;

  const isKo = vars.isKo;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isKo ? "OOH 광고 매체 계약서 (표준)" : "OOH Media Advertising Agreement (Standard)",
    margin,
    y,
  );
  y += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`ID: ${vars.contractId}`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제1조 (당사자)" : "Article 1 (Parties)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const line of wrapLines(
    doc,
    isKo
      ? `광고주(갑): ${vars.advertiserLine}`
      : `Advertiser: ${vars.advertiserLine}`,
    maxW,
  )) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제2조 (광고 매체)" : "Article 2 (Media)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  if (vars.mediaLines.length === 0) {
    const t = isKo ? "(매체명 별첨)" : "(See attachment)";
    doc.text(t, margin, y);
    y += 6;
  } else {
    for (const m of vars.mediaLines) {
      for (const line of wrapLines(doc, `· ${m}`, maxW)) {
        if (y > 275) {
          doc.addPage();
          y = 18;
        }
        doc.text(line, margin, y);
        y += 5;
      }
    }
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제3조 (집행 기간)" : "Article 3 (Period)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const line of wrapLines(doc, vars.period, maxW)) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제4조 (계약 금액)" : "Article 4 (Amount)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const line of wrapLines(doc, vars.amountLine, maxW)) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제5조 (특약)" : "Article 5 (Special terms)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const terms =
    vars.specialTerms?.trim() ||
    (isKo
      ? "별도 합의가 없는 한, 송출 일정·소재 규격은 매체사 정책 및 싱커드 운영 기준을 따릅니다."
      : "Unless otherwise agreed, scheduling and specs follow media owner policies and THINKAD operations.");
  for (const line of wrapLines(doc, terms, maxW)) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "제6조 (일반)" : "Article 6 (General)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const general = isKo
    ? "본 계약은 전자서명 및 기록된 메타데이터(서명 시각, 접속 IP 등)와 함께 보관됩니다. 분쟁 시 대한민국 법을 준거법으로 합니다."
    : "This agreement is stored with e-signature metadata (timestamp, IP). Governing law: Republic of Korea.";
  for (const line of wrapLines(doc, general, maxW)) {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  y += 10;

  if (options?.signaturePngBase64) {
    const raw = options.signaturePngBase64.includes(",")
      ? options.signaturePngBase64.split(",")[1]!
      : options.signaturePngBase64;
    try {
      const sigW = 56;
      const sigH = 22;
      const sigX = pageW - margin - sigW;
      if (y + sigH + 24 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.setFont("helvetica", "bold");
      doc.text(isKo ? "광고주 서명" : "Advertiser signature", margin, y);
      y += 6;
      doc.addImage(raw, "PNG", sigX, y - 4, sigW, sigH);
      y += sigH + 6;
    } catch {
      doc.text(isKo ? "(서명 이미지 처리 오류)" : "(Signature image error)", margin, y);
      y += 8;
    }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.rect(pageW - margin - 60, y, 60, 22);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(isKo ? "서명" : "Sign here", pageW - margin - 55, y + 13);
    doc.setFontSize(10);
    y += 28;
  }

  if (options?.audit) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isKo ? "전자서명 증거 기록" : "Electronic signature evidence",
      margin,
      y,
    );
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    const a = options.audit;
    const block = [
      isKo
        ? "본 문서는 전자서명법에 따른 전자서명이 적용되었습니다."
        : "This document bears an electronic signature under applicable e-signature law.",
      `${isKo ? "문서 고유번호" : "Document ID"}: ${a.documentNumber}`,
      `${isKo ? "서명자" : "Signer"}: ${a.signerName} <${a.signerEmail}>`,
      `${isKo ? "서명 일시(KST)" : "Signed at (KST)"}: ${a.signedAtKst}`,
      `IP: ${a.signerIp}`,
      `${isKo ? "계약서 내용 해시(SHA-256)" : "Document content SHA-256"}: ${a.documentContentSha256}`,
      `${isKo ? "서명 이미지 해시(SHA-256)" : "Signature image SHA-256"}: ${a.signatureImageSha256}`,
      `${isKo ? "기기" : "User-Agent"}: ${a.signerAgent.slice(0, 160)}${a.signerAgent.length > 160 ? "…" : ""}`,
    ];
    for (const row of block) {
      if (y > 285) {
        doc.addPage();
        y = 18;
      }
      for (const line of wrapLines(doc, row, maxW)) {
        doc.text(line, margin, y);
        y += 3.5;
      }
    }
  }

  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  const pdfBase64 = i >= 0 ? dataUri.slice(i + 1) : dataUri;
  const buf = Buffer.from(pdfBase64, "base64");
  const sha256 = createHash("sha256").update(buf).digest("hex");

  return { pdfBase64, sha256 };
}

/** 서명·감사 블록 포함 최종 PDF. DB `documentSha256`에는 반환된 `sha256`(파일 바이트)을 저장합니다. */
export async function buildSignedOohContractPdf(
  vars: OohContractPdfVars,
  signaturePngBase64: string,
  audit: OohContractSignAudit,
): Promise<{ pdfBase64: string; sha256: string }> {
  return buildOohContractPdf(vars, {
    signaturePngBase64,
    audit,
  });
}