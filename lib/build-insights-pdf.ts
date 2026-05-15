import type { InsightReport, VerticalStrategyBlock } from "@/lib/insights-reports";

function writeParagraphs(
  doc: import("jspdf").default,
  paragraphs: string[],
  x: number,
  yStart: number,
  maxWidth: number,
  lineHeight: number,
  pageBottom: number,
): number {
  let y = yStart;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, maxWidth);
    for (const line of lines) {
      if (y > pageBottom) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += lineHeight;
    }
    y += 2;
  }
  return y;
}

function writeBullets(
  doc: import("jspdf").default,
  bullets: string[],
  x: number,
  yStart: number,
  maxWidth: number,
  lineHeight: number,
  pageBottom: number,
): number {
  let y = yStart;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const b of bullets) {
    const prefix = "• ";
    const lines = doc.splitTextToSize(prefix + b, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      if (y > pageBottom) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i] as string, x, y);
      y += lineHeight;
    }
    y += 1;
  }
  return y;
}

function writeVerticalBlock(
  doc: import("jspdf").default,
  block: VerticalStrategyBlock,
  isKo: boolean,
  x: number,
  y: number,
  maxWidth: number,
  pageBottom: number,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (y > pageBottom - 10) {
    doc.addPage();
    y = 20;
  }
  doc.text(isKo ? block.labelKo : block.labelEn, x, y);
  y += 7;
  return writeBullets(
    doc,
    isKo ? block.bulletsKo : block.bulletsEn,
    x,
    y,
    maxWidth,
    5,
    pageBottom,
  );
}

export async function buildInsightReportPdf(
  report: InsightReport,
  _isKo: boolean,
): Promise<import("jspdf").default> {
  void _isKo;
  // Force English for PDF (Korean font not embedded)
  const isKo = false;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const x = 20;
  const maxW = 170;
  const bottom = 278;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const title = isKo ? report.titleKo : report.titleEn;
  const titleLines = doc.splitTextToSize(title, maxW);
  for (const line of titleLines) {
    doc.text(line, x, y);
    y += 7;
  }
  y += 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${isKo ? "발행" : "Published"}: ${report.publishedIso} · ${isKo ? report.labelKo : report.labelEn}`,
    x,
    y,
  );
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(isKo ? "요약" : "Executive summary", x, y);
  y += 7;
  y = writeBullets(
    doc,
    isKo ? report.summaryKo : report.summaryEn,
    x,
    y,
    maxW,
    5,
    bottom,
  );
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (y > bottom - 20) {
    doc.addPage();
    y = 20;
  }
  doc.text(isKo ? "시장 트렌드" : "Market trends", x, y);
  y += 7;
  y = writeParagraphs(
    doc,
    isKo ? report.marketTrendKo : report.marketTrendEn,
    x,
    y,
    maxW,
    5,
    bottom,
  );
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (y > bottom - 20) {
    doc.addPage();
    y = 20;
  }
  doc.text(isKo ? "DOOH 동향" : "DOOH outlook", x, y);
  y += 7;
  y = writeParagraphs(
    doc,
    isKo ? report.doohKo : report.doohEn,
    x,
    y,
    maxW,
    5,
    bottom,
  );
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (y > bottom - 20) {
    doc.addPage();
    y = 20;
  }
  doc.text(isKo ? "업종별 전략" : "Vertical playbooks", x, y);
  y += 8;

  for (const block of report.verticalBlocks) {
    y = writeVerticalBlock(doc, block, isKo, x, y, maxW, bottom);
    y += 4;
  }

  if (y + 14 > bottom) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const disc = isKo
    ? "THINKAD(싱커드) OOH 인사이트 · 본 문서는 데모용 요약이며 실제 계약·집행 조건과 다를 수 있습니다."
    : "THINKAD OOH Insights — demo summary; not binding for planning or contracts.";
  for (const line of doc.splitTextToSize(disc, maxW)) {
    if (y > bottom) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += 4;
  }

  return doc;
}

export async function insightReportPdfBlob(
  report: InsightReport,
  isKo: boolean,
): Promise<Blob> {
  const doc = await buildInsightReportPdf(report, isKo);
  return doc.output("blob") as Blob;
}

export async function downloadInsightReportPdf(
  report: InsightReport,
  isKo: boolean,
): Promise<void> {
  const doc = await buildInsightReportPdf(report, isKo);
  doc.save(`${report.pdfBaseName}.pdf`);
}
