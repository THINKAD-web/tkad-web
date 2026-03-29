import type { jsPDF } from "jspdf";
import {
  krFontFamily,
  registerNotoSansKrIfAvailable,
} from "@/lib/jspdf-register-noto-kr";

const NAVY: [number, number, number] = [26, 42, 108];
const MUTED: [number, number, number] = [90, 99, 114];

export type ComparePdfMediaRow = {
  name: string;
  location: string;
  /** 월 단가 (만원) */
  price: number;
  size: string;
  resolution: string;
  dailyFootTraffic: number;
  operatingHours: string;
  targetAge: string;
  advertiserHistory: string;
  nearbyFacilities: string;
  visibilityScore: number;
};

export type ComparePdfParams = {
  isKo: boolean;
  generatedAt: string;
  rows: ComparePdfMediaRow[];
};

function setFont(doc: jsPDF, fam: string, style: "normal" | "bold") {
  const s = style === "bold" ? "bold" : "normal";
  try {
    doc.setFont(fam, s);
  } catch {
    doc.setFont(fam, "normal");
  }
}

function writeLines(
  doc: jsPDF,
  fam: string,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  pageH: number,
  margin: number,
): number {
  let yy = y;
  for (const line of doc.splitTextToSize(text || "—", maxW)) {
    if (yy > pageH - margin - 6) {
      doc.addPage();
      yy = margin + 8;
    }
    doc.text(line, x, yy);
    yy += lineH;
  }
  return yy;
}

export async function createComparePdfDoc(
  p: ComparePdfParams,
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKr = registerNotoSansKrIfAvailable(doc);
  const fam = krFontFamily(hasKr);
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const innerW = pageW - margin * 2;
  let y = margin;

  setFont(doc, fam, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(
    p.isKo ? "매체 비교표" : "Media comparison",
    margin,
    y,
  );
  y += 8;

  setFont(doc, fam, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    p.isKo ? `발행일: ${p.generatedAt}` : `Generated: ${p.generatedAt}`,
    margin,
    y,
  );
  y += 10;

  const minPrice =
    p.rows.length > 0 ? Math.min(...p.rows.map((r) => r.price)) : 0;

  for (const r of p.rows) {
    if (y > pageH - margin - 40) {
      doc.addPage();
      y = margin + 6;
    }

    doc.setDrawColor(220, 226, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    setFont(doc, fam, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    y = writeLines(doc, fam, r.name, margin, y, innerW, 5, pageH, margin);
    y += 2;

    const lowest = r.price === minPrice && p.rows.length > 1;
    const kv: [string, string][] = p.isKo
      ? [
          ["위치", r.location],
          [
            "월 가격 (만원)",
            `${r.price.toLocaleString("ko-KR")}${lowest ? " · 최저가" : ""}`,
          ],
          ["크기", r.size],
          ["해상도", r.resolution],
          [
            "일일 유동인구",
            r.dailyFootTraffic.toLocaleString("ko-KR"),
          ],
          ["운영시간", r.operatingHours],
          ["타겟 연령대", r.targetAge],
          ["광고주 이력", r.advertiserHistory],
          ["주변 시설", r.nearbyFacilities],
          ["가시성 점수", `${r.visibilityScore}/100`],
        ]
      : [
          ["Location", r.location],
          [
            "Monthly price (10K KRW)",
            `${r.price.toLocaleString("en-US")}${lowest ? " · Lowest" : ""}`,
          ],
          ["Size", r.size],
          ["Resolution", r.resolution],
          [
            "Daily foot traffic",
            r.dailyFootTraffic.toLocaleString("en-US"),
          ],
          ["Hours", r.operatingHours],
          ["Target age", r.targetAge],
          ["Past advertisers", r.advertiserHistory],
          ["Nearby", r.nearbyFacilities],
          ["Visibility score", `${r.visibilityScore}/100`],
        ];

    doc.setFontSize(8.5);
    for (const [k, v] of kv) {
      if (y > pageH - margin - 14) {
        doc.addPage();
        y = margin + 6;
      }
      setFont(doc, fam, "bold");
      doc.setTextColor(...MUTED);
      doc.text(`${k}:`, margin, y);
      setFont(doc, fam, "normal");
      doc.setTextColor(...NAVY);
      const vx = margin + 42;
      const vw = innerW - 42;
      y = writeLines(doc, fam, v, vx, y, vw, 4.2, pageH, margin);
      y += 1;
    }

    y += 4;
  }

  if (y > pageH - margin - 20) {
    doc.addPage();
    y = margin + 6;
  }
  y += 4;
  doc.setDrawColor(220, 226, 232);
  doc.line(margin, y, pageW - margin, y);
  y += 8;
  setFont(doc, fam, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const disc = p.isKo
    ? "※ 본 자료는 비교 참고용이며, 실제 집행 조건·재고는 별도 확인이 필요합니다. 견적·상담: mannote@tkad.co.kr · 02-515-2772"
    : "※ For reference only; availability and terms require confirmation. Contact: mannote@tkad.co.kr · +82-2-515-2772";
  writeLines(doc, fam, disc, margin, y, innerW, 3.8, pageH, margin);

  return doc;
}

export async function comparePdfBuffer(p: ComparePdfParams): Promise<Buffer> {
  const doc = await createComparePdfDoc(p);
  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
