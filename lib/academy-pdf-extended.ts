import type { AcademyDownload } from "@/lib/academy-content";
import { generateAcademyAssetFullPdf } from "@/lib/academy-asset-ai";

const TARGET_PAGES: Record<string, number> = {
  "dl-guide": 30,
  "dl-checklist": 10,
  "dl-matrix": 5,
};

function seoulDateLabel(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 표지·목차·본문·FAQ·연락처 포함 확장 PDF */
export async function buildExtendedAcademyPdfBuffer(
  asset: AcademyDownload,
): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const x = 20;
  const maxW = 170;
  const targetPages = TARGET_PAGES[asset.id] ?? 10;
  const issued = seoulDateLabel();

  const full = await generateAcademyAssetFullPdf(asset, targetPages);

  let y = 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("THINKAD", x, 40);
  doc.setFontSize(16);
  for (const line of doc.splitTextToSize(asset.titleEn, maxW)) {
    doc.text(line, x, y);
    y += 8;
  }
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${issued} (KST)`, x, y);
  y += 8;
  doc.text(asset.descEn, x, y, { maxWidth: maxW });

  doc.addPage();
  y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Table of Contents", x, y);
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const toc = [
    "1. Overview",
    "2. Core content",
    "3. Checklists & matrices",
    "4. FAQ",
    "5. Contact",
  ];
  for (const item of toc) {
    doc.text(item, x, y);
    y += 7;
  }

  const writeBlock = (heading: string, paragraphs: string[]) => {
    doc.addPage();
    y = 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(heading, x, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const p of paragraphs) {
      for (const line of doc.splitTextToSize(p, maxW)) {
        if (y > 275) {
          doc.addPage();
          y = 24;
        }
        doc.text(line, x, y);
        y += 5;
      }
      y += 4;
    }
  };

  writeBlock("Overview", [asset.descEn, ...asset.bulletsEn.map((b) => `• ${b}`)]);
  writeBlock("Core content", full.bodySections);
  if (full.checklist.length) {
    writeBlock("Checklists", full.checklist);
  }
  writeBlock("FAQ", full.faq);
  writeBlock("Contact", full.contact);

  const pageCount = doc.getNumberOfPages();
  if (pageCount < targetPages) {
    doc.addPage();
    doc.setFontSize(9);
    doc.text(
      `Appendix — extended reference (${targetPages}-page target, generated ${pageCount} pages)`,
      x,
      24,
    );
    for (let i = pageCount + 1; i < targetPages; i++) {
      doc.addPage();
      doc.text(`THINKAD Academy — supplementary page ${i}`, x, 24);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
