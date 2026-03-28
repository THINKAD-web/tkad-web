import type { AcademyDownload, AcademyLesson } from "@/lib/academy-content";

export async function downloadAcademyOutlinePdf(
  lesson: AcademyLesson,
  isKo: boolean,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const title = isKo ? lesson.titleKo : lesson.titleEn;
  const bullets = isKo ? lesson.outlineKo : lesson.outlineEn;
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
  doc.text(
    isKo
      ? `예상 학습 시간: 약 ${lesson.durationMin}분 · THINKAD Academy`
      : `Est. duration: ~${lesson.durationMin} min · THINKAD Academy`,
    x,
    y,
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(isKo ? "강의 개요" : "Session outline", x, y);
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

  if (y + 10 > 278) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    isKo
      ? "본 자료는 교육용 데모이며 실제 집행 조건과 다를 수 있습니다."
      : "Educational demo — not binding for media planning.",
    x,
    y,
  );

  doc.save(lesson.pdfFileName);
}

export async function downloadAcademyAssetPdf(
  asset: AcademyDownload,
  isKo: boolean,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const title = isKo ? asset.titleKo : asset.titleEn;
  const desc = isKo ? asset.descKo : asset.descEn;
  const bullets = isKo ? asset.bulletsKo : asset.bulletsEn;
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
  doc.text(isKo ? "핵심 목차" : "Highlights", x, y);
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

  doc.save(asset.pdfFileName);
}
