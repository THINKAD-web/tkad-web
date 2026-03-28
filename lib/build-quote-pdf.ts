export type QuoteTemplateId = "default" | "premium";

export type QuotePdfRow = {
  name: string;
  location: string;
  price: number;
};

export type BuildQuotePdfParams = {
  template: QuoteTemplateId;
  logoDataUrl: string | null;
  isKo: boolean;
  company: string;
  name: string;
  periodLabel: string;
  monthlyCost: number;
  totalCost: number;
  rows: QuotePdfRow[];
};

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

export async function createQuotePdfDoc(p: BuildQuotePdfParams) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const isPremium = p.template === "premium";
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  if (isPremium) {
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageW, 11, "F");
    y = 22;
  }

  if (p.logoDataUrl) {
    try {
      const fmt = guessImageFormat(p.logoDataUrl);
      const logoW = 28;
      const logoH = 28;
      doc.addImage(p.logoDataUrl, fmt, pageW - margin - logoW, 14, logoW, logoH);
    } catch {
      /* ignore bad logo */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isPremium ? 20 : 18);
  doc.setTextColor(isPremium ? 15 : 0, isPremium ? 23 : 0, isPremium ? 42 : 0);
  const title = p.isKo ? "THINKAD 견적서" : "THINKAD Quote";
  doc.text(title, margin, y);
  y += isPremium ? 12 : 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    p.isKo
      ? `발행일: ${new Date().toISOString().slice(0, 10)}`
      : `Date: ${new Date().toISOString().slice(0, 10)}`,
    margin,
    y,
  );
  y += 6;

  const clientLine = p.isKo
    ? `고객사: ${p.company || "-"} / 담당자: ${p.name || "-"}`
    : `Company: ${p.company || "-"} / Contact: ${p.name || "-"}`;
  doc.text(clientLine, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(p.isKo ? "캠페인 개요" : "Campaign overview", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${p.isKo ? "집행 기간" : "Period"}: ${p.periodLabel}`,
    margin,
    y,
  );
  y += 6;
  doc.text(
    `${p.isKo ? "월 예상 집행비" : "Est. monthly"}: ₩${p.monthlyCost.toLocaleString(p.isKo ? "ko-KR" : "en-US")}${p.isKo ? "만원" : " (10K KRW)"}`,
    margin,
    y,
  );
  y += 6;
  doc.text(
    `${p.isKo ? "총 예상 집행비" : "Est. total"}: ₩${p.totalCost.toLocaleString(p.isKo ? "ko-KR" : "en-US")}${p.isKo ? "만원" : " (10K KRW)"}`,
    margin,
    y,
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(p.isKo ? "매체 상세" : "Media detail", margin, y);
  y += 5;

  if (isPremium) {
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
  }

  doc.setFontSize(9);
  doc.text(p.isKo ? "매체명" : "Media", margin, y);
  doc.text(p.isKo ? "지역/위치" : "Location", 88, y);
  doc.text(
    p.isKo ? "월 단가" : "Monthly",
    pageW - margin,
    y,
    { align: "right" },
  );
  y += 3;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  for (const row of p.rows) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const nameLines = doc.splitTextToSize(row.name, 60);
    doc.text(nameLines[0] ?? row.name, margin, y);
    const locLines = doc.splitTextToSize(row.location, 58);
    doc.text(locLines[0] ?? row.location, 88, y);
    doc.text(
      row.price.toLocaleString(p.isKo ? "ko-KR" : "en-US"),
      pageW - margin,
      y,
      { align: "right" },
    );
    y += 7;
  }

  if (y + 24 > 280) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `${p.isKo ? "총 예상 집행비 (부가세 별도)" : "Total (excl. VAT)"}: ₩${p.totalCost.toLocaleString(p.isKo ? "ko-KR" : "en-US")}${p.isKo ? "만원" : " (10K)"}`,
    margin,
    y,
  );
  y += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const disc = p.isKo
    ? "※ 본 견적은 참고용이며, 실제 계약 시 매체 재고·조건에 따라 달라질 수 있습니다."
    : "※ Illustrative quote only; final terms depend on inventory and contract.";
  for (const line of doc.splitTextToSize(disc, pageW - 2 * margin)) {
    if (y > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 4;
  }
  y += 2;
  doc.text(
    p.isKo
      ? "문의: mannote@tkad.co.kr · 02-515-2772"
      : "Contact: mannote@tkad.co.kr · +82-2-515-2772",
    margin,
    y,
  );

  return doc;
}

export async function saveQuotePdf(p: BuildQuotePdfParams, filename: string) {
  const doc = await createQuotePdfDoc(p);
  doc.save(filename);
}

export async function quotePdfToBase64(p: BuildQuotePdfParams): Promise<string> {
  const doc = await createQuotePdfDoc(p);
  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}
