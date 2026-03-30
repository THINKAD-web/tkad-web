import type { jsPDF } from "jspdf";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";

const NAVY: [number, number, number] = [26, 42, 108];
const GOLD: [number, number, number] = [180, 150, 90];

export type PlannerReportPdfLabels = {
  title: string;
  sectionOverview: string;
  sectionMedia: string;
  sectionEffect: string;
  sectionCost: string;
  sectionContact: string;
  labelGoal: string;
  labelBudget: string;
  labelPeriod: string;
  labelRegions: string;
  labelCategories: string;
  labelAge: string;
  labelIndustry: string;
  labelLocation: string;
  labelPrice: string;
  labelSize: string;
  labelResolution: string;
  labelType: string;
  labelDailyTraffic: string;
  labelMonthlyImp: string;
  labelTotalImp: string;
  labelRoiExpected: string;
  labelReachCore: string;
  labelReachExtended: string;
  labelCostBreakdown: string;
  labelShare: string;
  labelCpm: string;
  sectionBudgetAllocation: string;
  budgetAllocationIntro: string;
  sectionEffectSummary: string;
  effectSummaryIntro: string;
  reportSectionCompositeNote: string;
  reportCompositeBody: string;
  footerDisclaimer: string;
};

export type PlannerReportPdfMediaRow = {
  name: string;
  location: string;
  price: number;
  size: string;
  resolution: string;
  type: string;
  dailyFootTraffic: number;
  imageUrl: string | null;
};

export type PlannerReportPdfBudgetSlice = {
  label: string;
  pct: number;
  valueMan: number;
};

export type PlannerReportPdfParams = {
  labels: PlannerReportPdfLabels;
  generatedAt: string;
  goalText: string;
  budgetMan: number;
  /** 표시용 기간 문구 (예: 2주, 3개월) */
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  isKo: boolean;
  portfolio: PlannerReportPdfMediaRow[];
  metrics: {
    monthlyImp: number;
    totalImp: number;
    roiExpected: number;
    reachCorePct: number;
    reachExtendedPct: number;
  } | null;
  /** 예산 유형별 비중(차트·표) */
  budgetAllocation: PlannerReportPdfBudgetSlice[];
  /** 포트폴리오 기준 블렌드 CPM(원/천회), 없으면 null */
  blendedCpmKrw: number | null;
  /** 예측 효과 요약 불릿 */
  effectSummaryLines: string[];
  contact: {
    company: string;
    phone: string;
    email: string;
    address: string;
  };
};

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imgFormatFromDataUrl(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  return "JPEG";
}

function addImageSafe(
  doc: jsPDF,
  dataUrl: string,
  fmt: "JPEG" | "PNG" | "WEBP",
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  try {
    doc.addImage(dataUrl, fmt, x, y, w, h);
    return true;
  } catch (e) {
    console.warn("[planner-pdf] addImage failed:", e);
    return false;
  }
}

function setFont(
  doc: jsPDF,
  hasKrFont: boolean,
  style: "normal" | "bold",
): void {
  const fam = krFontFamily(hasKrFont);
  try {
    if (hasKrFont) {
      doc.setFont(fam, "normal");
    } else {
      doc.setFont(fam, style === "bold" ? "bold" : "normal");
    }
  } catch {
    try {
      doc.setFont("helvetica", style === "bold" ? "bold" : "normal");
    } catch {
      doc.setFont("helvetica", "normal");
    }
  }
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  need: number,
  pageH: number,
  margin: number,
): number {
  if (y + need > pageH - margin) {
    doc.addPage();
    return margin + 10;
  }
  return y;
}

export async function buildPlannerReportPdf(
  p: PlannerReportPdfParams,
): Promise<jsPDF> {
  try {
    return await buildPlannerReportPdfInner(p);
  } catch (e) {
    console.error("[planner-pdf] buildPlannerReportPdf failed:", e);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

async function buildPlannerReportPdfInner(
  p: PlannerReportPdfParams,
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const { registerNotoSansKrFromFetch } = await import(
    "@/lib/jspdf-register-noto-kr-browser"
  );
  let doc: jsPDF;
  try {
    doc = new JsPDF({ unit: "mm", format: "a4" });
  } catch (e) {
    console.error("[planner-pdf] new jsPDF failed:", e);
    throw e instanceof Error ? e : new Error(String(e));
  }
  const hasKrFont = await registerNotoSansKrFromFetch(doc);
  const { labels, portfolio, metrics, contact } = p;

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin + 6;
  const lh = 5.2;
  const lhTight = 4.6;

  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.text(labels.title, margin, y);
  y += 9;

  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 88, 102);
  doc.text(p.generatedAt, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  setFont(doc, hasKrFont, "bold");
  doc.text(labels.sectionOverview, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 35);

  const overviewLines = [
    `${labels.labelGoal}: ${p.goalText}`,
    `${labels.labelBudget}: ${p.isKo ? `${p.budgetMan.toLocaleString()}만원 (총)` : `${p.budgetMan.toLocaleString()} ₩10K (total)`}`,
    `${labels.labelPeriod}: ${p.periodDisplay}`,
    `${labels.labelRegions}: ${p.regionsText}`,
    `${labels.labelCategories}: ${p.categoriesText}`,
    `${labels.labelAge}: ${p.ageText}`,
    `${labels.labelIndustry}: ${p.industryText}`,
  ];
  for (const line of overviewLines) {
    y = ensureSpace(doc, y, lh * 2, pageH, margin);
    const lines = doc.splitTextToSize(line, maxW);
    doc.text(lines, margin, y);
    y += lines.length * lhTight + 1;
  }
  y += 4;

  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.sectionMedia, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setTextColor(30, 30, 35);

  for (let i = 0; i < portfolio.length; i++) {
    const m = portfolio[i];
    y = ensureSpace(doc, y, 42, pageH, margin);
    doc.setFontSize(10);
    setFont(doc, hasKrFont, "bold");
    doc.text(`${i + 1}. ${m.name}`, margin, y);
    y += lh;

    setFont(doc, hasKrFont, "normal");
    const detail = [
      `${labels.labelLocation}: ${m.location}`,
      `${labels.labelPrice}: ₩${m.price.toLocaleString()}${p.isKo ? "만/월" : " ₩10K/mo"}`,
      `${labels.labelType}: ${m.type}`,
      `${labels.labelSize}: ${m.size || "—"}`,
      `${labels.labelResolution}: ${m.resolution || "—"}`,
      `${labels.labelDailyTraffic}: ${m.dailyFootTraffic.toLocaleString()}`,
    ];
    for (const line of detail) {
      const lines = doc.splitTextToSize(line, maxW);
      doc.text(lines, margin, y);
      y += lines.length * lhTight;
    }

    if (m.imageUrl) {
      const dataUrl = await fetchDataUrl(m.imageUrl);
      if (dataUrl) {
        y = ensureSpace(doc, y, 58, pageH, margin);
        const fmt = imgFormatFromDataUrl(dataUrl);
        if (addImageSafe(doc, dataUrl, fmt, margin, y, maxW, 50)) y += 54;
        else y += 2;
      }
    }
    y += 4;
  }

  y = ensureSpace(doc, y, 28, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.reportSectionCompositeNote, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 35);
  const compositeBody = doc.splitTextToSize(labels.reportCompositeBody, maxW);
  doc.text(compositeBody, margin, y);
  y += compositeBody.length * lhTight + 6;

  y = ensureSpace(doc, y, 36, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.sectionEffect, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 35);
  if (metrics) {
    const eff: string[] = [
      `${labels.labelMonthlyImp}: ${metrics.monthlyImp.toLocaleString()}`,
      `${labels.labelTotalImp}: ${metrics.totalImp.toLocaleString()}`,
      `${labels.labelReachCore}: ${metrics.reachCorePct}%`,
      `${labels.labelReachExtended}: ${metrics.reachExtendedPct}%`,
    ];
    if (p.blendedCpmKrw != null) {
      eff.push(
        `${labels.labelCpm}: ₩${p.blendedCpmKrw.toLocaleString()}${p.isKo ? " / 천회 노출" : " / 1K impr."}`,
      );
    }
    eff.push(`${labels.labelRoiExpected}: ${metrics.roiExpected}`);
    for (const line of eff) {
      y = ensureSpace(doc, y, lh * 2, pageH, margin);
      const wrapped = doc.splitTextToSize(line, maxW);
      doc.text(wrapped, margin, y);
      y += wrapped.length * lhTight + 1;
    }
  } else {
    doc.text("—", margin, y);
    y += lh * 2;
  }

  y += 4;
  y = ensureSpace(doc, y, 28, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.sectionEffectSummary, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 66, 78);
  const sumIntro = doc.splitTextToSize(labels.effectSummaryIntro, maxW);
  doc.text(sumIntro, margin, y);
  y += sumIntro.length * lhTight + 2;
  doc.setTextColor(30, 30, 35);
  for (const line of p.effectSummaryLines) {
    y = ensureSpace(doc, y, lh * 2, pageH, margin);
    const wrapped = doc.splitTextToSize(`• ${line}`, maxW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * lhTight + 1;
  }

  y += 4;
  y = ensureSpace(doc, y, 30, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.sectionBudgetAllocation, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 66, 78);
  const allocIntro = doc.splitTextToSize(labels.budgetAllocationIntro, maxW);
  doc.text(allocIntro, margin, y);
  y += allocIntro.length * lhTight + 3;
  doc.setTextColor(30, 30, 35);

  const barH = 3.4;
  const barMaxW = maxW;
  if (p.budgetAllocation.length === 0) {
    y = ensureSpace(doc, y, lh * 2, pageH, margin);
    doc.text("—", margin, y);
    y += lh + 2;
  }
  for (const row of p.budgetAllocation) {
    y = ensureSpace(doc, y, 16, pageH, margin);
    const cap = `${row.label} — ${row.pct}% · ${row.valueMan.toLocaleString()}${p.isKo ? "만/월" : " ₩10K/mo"}`;
    const capLines = doc.splitTextToSize(cap, maxW);
    doc.text(capLines, margin, y);
    y += capLines.length * lhTight + 1.2;
    doc.setFillColor(241, 243, 248);
    doc.rect(margin, y, barMaxW, barH, "F");
    doc.setFillColor(...GOLD);
    doc.rect(
      margin,
      y,
      (barMaxW * Math.min(100, Math.max(0, row.pct))) / 100,
      barH,
      "F",
    );
    doc.setDrawColor(210, 214, 223);
    doc.rect(margin, y, barMaxW, barH, "S");
    y += barH + 5;
  }

  y += 2;
  y = ensureSpace(doc, y, 24, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...NAVY);
  doc.text(labels.sectionCost, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");

  const sumPrice = portfolio.reduce((s, m) => s + m.price, 0) || 1;
  for (const m of portfolio) {
    const share = Math.round((m.price / sumPrice) * 1000) / 10;
    y = ensureSpace(doc, y, lh * 2, pageH, margin);
    const line = `${m.name} — ₩${m.price.toLocaleString()} (${labels.labelShare}: ${share}%)`;
    const lines = doc.splitTextToSize(line, maxW);
    doc.text(lines, margin, y);
    y += lines.length * lhTight + 1;
  }

  y += 6;
  y = ensureSpace(doc, y, 36, pageH, margin);
  setFont(doc, hasKrFont, "bold");
  doc.setTextColor(...GOLD);
  doc.text(labels.sectionContact, margin, y);
  y += 6;
  setFont(doc, hasKrFont, "normal");
  doc.setTextColor(30, 30, 35);
  const cLines = [
    contact.company,
    contact.phone,
    contact.email,
    contact.address,
  ];
  for (const line of cLines) {
    y = ensureSpace(doc, y, lh * 2, pageH, margin);
    const lines = doc.splitTextToSize(line, maxW);
    doc.text(lines, margin, y);
    y += lines.length * lhTight + 1;
  }

  y += 6;
  y = ensureSpace(doc, y, 16, pageH, margin);
  doc.setFontSize(8);
  doc.setTextColor(120, 128, 140);
  const disc = doc.splitTextToSize(labels.footerDisclaimer, maxW);
  doc.text(disc, margin, y);

  doc.setProperties({
    title: labels.title,
    subject: "THINKAD Planner",
    creator: "THINKAD",
  });

  return doc;
}
