import type { jsPDF } from "jspdf";

const NAVY: [number, number, number] = [26, 42, 108];
const MUTED: [number, number, number] = [90, 99, 114];
const HELV = "helvetica";

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

/** Compare PDF: always English labels + Helvetica (no CJK / no Identity-H). */
export type ComparePdfParams = {
  generatedAt: string;
  rows: ComparePdfMediaRow[];
};

function latinOrDash(s: string, fallback: string): string {
  const x = (s ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  return x.length >= 1 ? x.slice(0, 800) : fallback;
}

function compareRowLatinized(r: ComparePdfMediaRow): ComparePdfMediaRow {
  return {
    name: latinOrDash(r.name, "Media"),
    location: latinOrDash(r.location, "—"),
    price: r.price,
    size: latinOrDash(r.size, "—"),
    resolution: latinOrDash(r.resolution, "—"),
    dailyFootTraffic: r.dailyFootTraffic,
    operatingHours: latinOrDash(r.operatingHours, "—"),
    targetAge: latinOrDash(r.targetAge, "—"),
    advertiserHistory: latinOrDash(r.advertiserHistory, "—"),
    nearbyFacilities: latinOrDash(r.nearbyFacilities, "—"),
    visibilityScore: r.visibilityScore,
  };
}

type FontState = { fam: string };

function setFont(doc: jsPDF, state: FontState, style: "normal" | "bold") {
  const fam = state.fam;
  const s = style === "bold" ? "bold" : "normal";
  try {
    doc.setFont(fam, s);
  } catch (e) {
    console.warn("[pdf:compare] setFont failed:", fam, s, e);
    state.fam = HELV;
    try {
      doc.setFont(HELV, style === "bold" ? "bold" : "normal");
    } catch (e2) {
      console.error("[pdf:compare] helvetica setFont failed:", e2);
    }
  }
}

function safeTextLine(doc: jsPDF, text: string, x: number, y: number): void {
  try {
    const t = text || "—";
    doc.text(t, x, y);
  } catch (e) {
    console.warn("[pdf:compare] doc.text failed:", e);
    try {
      doc.text("—", x, y);
    } catch (e2) {
      console.error("[pdf:compare] placeholder text failed:", e2);
    }
  }
}

function writeLines(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  pageH: number,
  margin: number,
): number {
  let yy = y;
  try {
    const lines = doc.splitTextToSize(text || "—", maxW);
    for (const line of lines) {
      if (yy > pageH - margin - 6) {
        doc.addPage();
        yy = margin + 8;
      }
      safeTextLine(doc, line, x, yy);
      yy += lineH;
    }
  } catch (e) {
    console.error("[pdf:compare] writeLines failed:", e);
    safeTextLine(doc, "—", x, yy);
    yy += lineH;
  }
  return yy;
}

function renderCompareContent(
  doc: jsPDF,
  p: {
    generatedAt: string;
    rows: ComparePdfMediaRow[];
  },
): void {
  const { generatedAt, rows } = p;
  const fontState: FontState = { fam: HELV };
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const innerW = pageW - margin * 2;
  let y = margin;

  setFont(doc, fontState, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  safeTextLine(doc, "Media comparison", margin, y);
  y += 8;

  setFont(doc, fontState, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  safeTextLine(doc, `Generated: ${generatedAt}`, margin, y);
  y += 10;

  const minPrice = rows.length > 0 ? Math.min(...rows.map((r) => r.price)) : 0;

  for (const r of rows) {
    if (y > pageH - margin - 40) {
      doc.addPage();
      y = margin + 6;
    }

    doc.setDrawColor(220, 226, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    setFont(doc, fontState, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    y = writeLines(doc, r.name, margin, y, innerW, 5, pageH, margin);
    y += 2;

    const lowest = r.price === minPrice && rows.length > 1;
    const kv: [string, string][] = [
      ["Location", r.location],
      [
        "Monthly price (10K KRW)",
        `${r.price.toLocaleString("en-US")}${lowest ? " · Lowest" : ""}`,
      ],
      ["Size", r.size],
      ["Resolution", r.resolution],
      ["Daily foot traffic", r.dailyFootTraffic.toLocaleString("en-US")],
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
      setFont(doc, fontState, "bold");
      doc.setTextColor(...MUTED);
      safeTextLine(doc, `${k}:`, margin, y);
      setFont(doc, fontState, "normal");
      doc.setTextColor(...NAVY);
      const vx = margin + 42;
      const vw = innerW - 42;
      y = writeLines(doc, v, vx, y, vw, 4.2, pageH, margin);
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
  setFont(doc, fontState, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const disc =
    "For reference only; availability and terms require confirmation. " +
    "Korean text may be omitted above — see the website for full Korean copy. " +
    "Contact: sales@tkad.co.kr · +82-2-515-2772";
  writeLines(doc, disc, margin, y, innerW, 3.8, pageH, margin);
}

export async function createComparePdfDoc(p: ComparePdfParams): Promise<jsPDF> {
  const rowsSafe = p.rows.map(compareRowLatinized);
  const paramsSafe = { generatedAt: p.generatedAt, rows: rowsSafe };

  try {
    const { default: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    console.log("[pdf:compare]", {
      rowCount: rowsSafe.length,
      mode: "english+helvetica",
      generatedAt: p.generatedAt,
    });

    try {
      renderCompareContent(doc, paramsSafe);
    } catch (e) {
      console.error("[pdf:compare] renderCompareContent failed:", e);
      throw e;
    }

    return doc;
  } catch (e) {
    console.error("[pdf:compare] createComparePdfDoc fatal, minimal PDF:", e);
    const { default: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    try {
      renderCompareContent(doc, paramsSafe);
    } catch (e2) {
      console.error("[pdf:compare] fallback render failed:", e2);
      doc.setFont(HELV, "normal");
      doc.setFontSize(12);
      doc.text("THINKAD — Media comparison", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${p.generatedAt}`, 14, 30);
      let yy = 45;
      for (const r of rowsSafe) {
        doc.text(`${r.name} — ${r.price} (10K KRW/mo)`, 14, yy);
        yy += 8;
        if (yy > 280) {
          doc.addPage();
          yy = 20;
        }
      }
    }
    return doc;
  }
}

export async function comparePdfBuffer(p: ComparePdfParams): Promise<Buffer> {
  try {
    const doc = await createComparePdfDoc(p);
    const out = doc.output("arraybuffer") as ArrayBuffer;
    return Buffer.from(out);
  } catch (e) {
    console.error("[pdf:compare] comparePdfBuffer output failed:", e);
    const { default: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont(HELV, "normal");
    doc.text("Media comparison (error — see logs)", 14, 20);
    const out = doc.output("arraybuffer") as ArrayBuffer;
    return Buffer.from(out);
  }
}
