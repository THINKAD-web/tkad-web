import type { AcademyDownload } from "@/lib/academy-content";

/** 서버·Edge에서 jsPDF로 아카데미 자료 PDF 버퍼 생성 */
export async function buildAcademyAssetPdfBuffer(
  asset: AcademyDownload,
  extraSections?: string[],
): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const title = asset.titleEn;
  const desc = asset.descEn;
  const bullets = asset.bulletsEn;
  const x = 20;
  const maxW = 170;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  for (const line of doc.splitTextToSize(title, maxW)) {
    doc.text(line, x, y);
    y += 7;
  }
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const line of doc.splitTextToSize(desc, maxW)) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += 5;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Highlights", x, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  for (const b of bullets) {
    const lines = doc.splitTextToSize(`• ${b}`, maxW);
    for (const line of lines) {
      if (y > 278) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += 5;
    }
    y += 2;
  }

  if (extraSections?.length) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Insights (AI)", x, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    for (const section of extraSections) {
      for (const line of doc.splitTextToSize(section, maxW)) {
        if (y > 278) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, x, y);
        y += 5;
      }
      y += 4;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.text("THINKAD Academy — thinkad.co.kr", x, y);

  const ab = doc.output("arraybuffer");
  return Buffer.from(ab);
}
