import type { MediaOwnerReportTheme, MediaOwnerReportType } from "@prisma/client";
import type { jsPDF } from "jspdf";
import {
  krFontFamily,
  ensureKrFontForServerPdf,
} from "@/lib/jspdf-register-noto-kr";
import type { MediaOwnerWhitelabelMode } from "@/lib/media-owner-report-access";
import type { MediaOwnerReportPayload } from "@/lib/media-owner-report-data";

export type BrandingProfile = {
  logoUrl?: string | null;
  companyName?: string | null;
  businessNumber?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  theme: MediaOwnerReportTheme;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 18;
const CW = PAGE_W - MX * 2;

const THEMES: Record<
  MediaOwnerReportTheme,
  { accent: [number, number, number]; label: string }
> = {
  ORANGE: { accent: [255, 102, 0], label: "Orange" },
  BLUE: { accent: [37, 99, 235], label: "Blue" },
  VIOLET: { accent: [124, 58, 237], label: "Violet" },
};

function pctChange(cur: number, prev: number): string {
  if (prev <= 0) return cur > 0 ? "+100%" : "0%";
  const p = Math.round(((cur - prev) / prev) * 100);
  return `${p >= 0 ? "+" : ""}${p}%`;
}

function addPageIfNeeded(doc: jsPDF, y: number, need = 20): number {
  if (y > PAGE_H - need) {
    doc.addPage();
    return 24;
  }
  return y;
}

function addPageWithHeader(
  doc: jsPDF,
  title: string,
  accent: [number, number, number],
  hasKrFont: boolean,
) {
  doc.addPage();
  doc.setFont(krFontFamily(hasKrFont), "normal");
  doc.setFillColor(...accent);
  doc.rect(0, 0, PAGE_W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title, MX, 9);
  doc.setTextColor(0, 0, 0);
}

function writeLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  maxW: number,
  lh = 5.5,
): number {
  for (const line of lines) {
    y = addPageIfNeeded(doc, y);
    const wrapped = doc.splitTextToSize(line, maxW) as string[];
    for (const w of wrapped) {
      y = addPageIfNeeded(doc, y);
      doc.text(w, x, y);
      y += lh;
    }
  }
  return y;
}

function drawWatermark(doc: jsPDF) {
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(42);
  doc.text("THINKAD", PAGE_W / 2, PAGE_H / 2, {
    align: "center",
    angle: 35,
  });
  doc.setTextColor(0, 0, 0);
}

function drawFooter(
  doc: jsPDF,
  whitelabel: MediaOwnerWhitelabelMode,
  branding: BrandingProfile,
  pageNum: number,
) {
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (whitelabel === "enterprise") {
    doc.text(branding.companyName ?? "Media Report", MX, PAGE_H - 10);
  } else if (whitelabel === "pro") {
    doc.text(
      `${branding.companyName ?? ""} · Powered by THINKAD`.trim(),
      MX,
      PAGE_H - 10,
    );
  } else {
    doc.text("THINKAD 데이터 제공 · thinkad.co.kr", MX, PAGE_H - 10);
  }
  doc.text(String(pageNum), PAGE_W - MX, PAGE_H - 10, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function drawCover(
  doc: jsPDF,
  payload: MediaOwnerReportPayload,
  reportType: MediaOwnerReportType,
  branding: BrandingProfile,
  whitelabel: MediaOwnerWhitelabelMode,
  periodLabel: string,
) {
  const theme = THEMES[branding.theme];
  doc.setFillColor(...theme.accent);
  doc.rect(0, 0, PAGE_W, 52, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  const header =
    whitelabel === "enterprise"
      ? branding.companyName ?? "Media Report"
      : whitelabel === "pro"
        ? branding.companyName ?? payload.media.name
        : "THINKAD · 매체 데이터 리포트";
  doc.text(header, MX, 18);

  doc.setFontSize(22);
  const titles: Record<MediaOwnerReportType, string> = {
    SPEC_SHEET: "매체 스펙 시트",
    MONTHLY: "월간 성과 보고서",
    ANNUAL: "연간 데이터 보고서",
    CATALOG: "매체 카탈로그",
  };
  doc.text(titles[reportType], MX, 34);
  doc.setFontSize(12);
  doc.text(payload.media.name, MX, 44);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(periodLabel, MX, 68);
  doc.text(payload.media.location, MX, 76);
  if (payload.media.isVerified && whitelabel !== "enterprise") {
    doc.setFillColor(...theme.accent);
    doc.rect(MX, 84, 36, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("THINKAD Verified", MX + 2, 89.5);
    doc.setTextColor(0, 0, 0);
  }
}

function drawBarChart(
  doc: jsPDF,
  labels: string[],
  values: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  accent: [number, number, number],
) {
  const max = Math.max(...values, 1);
  const barW = w / values.length - 2;
  labels.forEach((label, i) => {
    const v = values[i] ?? 0;
    const bh = (v / max) * (h - 12);
    const bx = x + i * (barW + 2);
    doc.setFillColor(...accent);
    doc.rect(bx, y + h - bh - 8, barW, bh, "F");
    doc.setFontSize(7);
    doc.text(label, bx + barW / 2, y + h, { align: "center" });
    doc.text(String(v), bx + barW / 2, y + h - bh - 10, { align: "center" });
  });
}

function renderSpecSheet(
  doc: jsPDF,
  payload: MediaOwnerReportPayload,
  accent: [number, number, number],
) {
  let y = 100;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 매체 기본 정보"], MX, y, CW, 7);
  doc.setFontSize(10);
  const m = payload.media;
  y = writeLines(
    doc,
    [
      `유형: ${m.type} · 지역: ${m.region}`,
      `규격: ${m.size ?? "—"}`,
      `운영: ${m.operatingHours ?? "24시간 또는 매체사 협의"}`,
      `일 유동: ${m.dailyFootTraffic?.toLocaleString("ko-KR") ?? "추정"}명`,
    ],
    MX,
    y + 2,
    CW,
  );

  y += 6;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 위치 · 주변 랜드마크"], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    [
      m.location,
      m.nearbyStations ? `인근 역: ${m.nearbyStations}` : "",
      m.nearbyLandmarks ? `랜드마크: ${m.nearbyLandmarks}` : "",
      m.lat && m.lng ? `좌표: ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` : "",
    ].filter(Boolean),
    MX,
    y + 2,
    CW,
  );

  y += 6;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 시간대별 유동 (지수)"], MX, y, CW, 7);
  y = addPageIfNeeded(doc, y + 4, 50);
  drawBarChart(
    doc,
    payload.analytics.timeSlots.map((t) => t.labelKo),
    payload.analytics.timeSlots.map((t) => t.index),
    MX,
    y,
    CW,
    40,
    accent,
  );
  y += 48;

  doc.setFontSize(14);
  y = writeLines(doc, ["■ 요일별 노출 지수"], MX, y, CW, 7);
  y = addPageIfNeeded(doc, y + 4, 50);
  drawBarChart(
    doc,
    payload.analytics.weeklyIndex.map((d) => d.dayKo),
    payload.analytics.weeklyIndex.map((d) => d.index),
    MX,
    y,
    CW,
    36,
    accent,
  );
  y += 44;

  y = addPageIfNeeded(doc, y);
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 주변 상권 (반경 500m 추정)"], MX, y, CW, 7);
  doc.setFontSize(10);
  const c = payload.analytics.commerce;
  y = writeLines(
    doc,
    [
      `카페 ${c.cafe}% · 오피스 ${c.office}% · 쇼핑 ${c.shopping}% · 주거 ${c.residential}%`,
      payload.analytics.commerceInsightKo,
    ],
    MX,
    y + 2,
    CW,
  );

  y += 4;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 연령/성별 추정"], MX, y, CW, 7);
  doc.setFontSize(10);
  const ag = payload.ageGender;
  y = writeLines(
    doc,
    [
      `20대 ${ag.age20s}% · 30대 ${ag.age30s}% · 40대 ${ag.age40s}% · 50+ ${ag.age50plus}%`,
      `남 ${ag.male}% · 여 ${ag.female}%`,
      payload.analytics.isEstimated ? "(THINKAD 추정치)" : "",
    ].filter(Boolean),
    MX,
    y + 2,
    CW,
  );

  y += 4;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 추천 광고주 업종"], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    payload.industryFits.slice(0, 5).map((f) => `${f.industry}: ${f.score}점`),
    MX,
    y + 2,
    CW,
  );

  if (m.price) {
    y += 4;
    doc.setFontSize(14);
    y = writeLines(doc, ["■ 가격 정보"], MX, y, CW, 7);
    doc.setFontSize(10);
    y = writeLines(
      doc,
      [`₩${m.price.toLocaleString("ko-KR")} / ${m.pricePeriod ?? "month"}`],
      MX,
      y + 2,
      CW,
    );
  }

  if (payload.executionCases.length) {
    y += 4;
    doc.setFontSize(14);
    y = writeLines(doc, ["■ 집행 사례"], MX, y, CW, 7);
    doc.setFontSize(10);
    y = writeLines(doc, payload.executionCases.map((c) => `· ${c}`), MX, y + 2, CW);
  }
}

function renderMonthly(
  doc: jsPDF,
  payload: MediaOwnerReportPayload,
  month: string,
  accent: [number, number, number],
) {
  let y = 100;
  const me = payload.monthlyEngagement;
  doc.setFontSize(14);
  y = writeLines(doc, [`■ ${month} 성과 요약`], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    [
      `조회 ${me?.views ?? 0} (${pctChange(me?.views ?? 0, me?.prevViews ?? 0)} vs 전월)`,
      `찜 ${me?.favorites ?? 0} (${pctChange(me?.favorites ?? 0, me?.prevFavorites ?? 0)} vs 전월)`,
      `문의 ${me?.inquiries ?? 0} (${pctChange(me?.inquiries ?? 0, me?.prevInquiries ?? 0)} vs 전월)`,
      `확정 캠페인 ${payload.campaignsThisMonth}건`,
    ],
    MX,
    y + 2,
    CW,
  );

  y += 6;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 업종 분포"], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    payload.industryBreakdown.length
      ? payload.industryBreakdown.map((i) => `${i.industry}: ${i.count}건`)
      : ["집행 데이터 수집 중"],
    MX,
    y + 2,
    CW,
  );

  y += 6;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 동일 지역 벤치마크"], MX, y, CW, 7);
  doc.setFontSize(10);
  const rb = payload.regionBenchmark;
  y = writeLines(
    doc,
    [
      `${rb.label} 평균 조회 ${rb.avgViews} · 본 매체 ${rb.thisViews}`,
      rb.thisViews >= rb.avgViews ? "지역 평균 이상" : "지역 평균 대비 개선 여지",
    ],
    MX,
    y + 2,
    CW,
  );

  y += 8;
  drawBarChart(
    doc,
    payload.monthlyTrend.slice(-6).map((t) => t.month.slice(5)),
    payload.monthlyTrend.slice(-6).map((t) => t.views),
    MX,
    y,
    CW,
    40,
    accent,
  );
  y += 48;
  doc.setFontSize(10);
  y = writeLines(doc, [`다음 달 전망: ${payload.nextMonthTrendKo}`], MX, y, CW);
}

function renderAnnual(
  doc: jsPDF,
  payload: MediaOwnerReportPayload,
  year: number,
  accent: [number, number, number],
) {
  let y = 100;
  doc.setFontSize(14);
  y = writeLines(doc, [`■ ${year}년 종합`], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    [
      `누적 조회 ${payload.engagement.viewCount} · 찜 ${payload.engagement.favoriteCount} · 문의 ${payload.engagement.inquiryCount}`,
      `리뷰 ${payload.reviewCount}건 · 평균 ${payload.reviewScore ?? "—"}점`,
    ],
    MX,
    y + 2,
    CW,
  );

  y += 6;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 월별 트렌드"], MX, y, CW, 7);
  y = addPageIfNeeded(doc, y + 4, 50);
  drawBarChart(
    doc,
    payload.monthlyTrend.map((t) => t.month.slice(5)),
    payload.monthlyTrend.map((t) => t.views),
    MX,
    y,
    CW,
    44,
    accent,
  );
  y += 52;

  doc.setFontSize(14);
  y = writeLines(doc, ["■ 베스트 시즌"], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(
    doc,
    payload.analytics.seasons
      .filter((s) => s.recommended)
      .map((s) => `${s.seasonKo} (지수 ${s.index})`),
    MX,
    y + 2,
    CW,
  );

  y += 4;
  doc.setFontSize(14);
  y = writeLines(doc, ["■ 단가 컨설팅"], MX, y, CW, 7);
  doc.setFontSize(10);
  y = writeLines(doc, [payload.recommendedPriceNote ?? "—"], MX, y + 2, CW);
}

function renderDataMethodologyPage(
  doc: jsPDF,
  payload: MediaOwnerReportPayload,
  accent: [number, number, number],
  hasKrFont: boolean,
) {
  addPageWithHeader(doc, "데이터 출처 및 방법론", accent, hasKrFont);
  let y = 36;
  doc.setFontSize(10);
  const conf = payload.analytics.overallConfidence;
  if (conf != null) {
    y = writeLines(
      doc,
      [`종합 신뢰도: ${conf}% (실측·공공·추정 소스 가중 평균)`],
      MX,
      y,
      CW,
    );
    y += 4;
  }
  const attrs = payload.analytics.attributions ?? [];
  if (attrs.length === 0) {
    writeLines(
      doc,
      [
        "유동인구·상권 지표는 매체 유형·지역·공공데이터(서울 열린데이터, SGIS+)와",
        "통계 기반 추정 모델을 혼합해 산출합니다. 월 1회 자동 갱신됩니다.",
      ],
      MX,
      y,
      CW,
    );
    return;
  }
  for (const a of attrs) {
    y = writeLines(
      doc,
      [`[${a.labelKo}] (신뢰도 ${a.confidenceScore}%)`],
      MX,
      y,
      CW,
    );
    y += 2;
    if (y > 270) {
      addPageWithHeader(doc, "데이터 출처 (계속)", accent, hasKrFont);
      y = 36;
    }
  }
  y += 4;
  writeLines(
    doc,
    [
      "방법론: 다중 소스 가중 병합(lib/data-fusion.ts). KT/SKT 실측 > 서울 공공 > SGIS > 추정.",
      "날씨·이벤트: 기상청 단기예보 + 지역 이벤트 캘린더 휴리스틱.",
    ],
    MX,
    y,
    CW,
  );
}

export async function buildMediaOwnerReportPdf(opts: {
  payload: MediaOwnerReportPayload;
  reportType: MediaOwnerReportType;
  branding: BrandingProfile;
  whitelabel: MediaOwnerWhitelabelMode;
  watermark: boolean;
  periodMonth?: string;
  year?: number;
}): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKrFont = await ensureKrFontForServerPdf(doc);
  doc.setFont(krFontFamily(hasKrFont), "normal");

  const theme = THEMES[opts.branding.theme];
  const now = new Date();
  const month =
    opts.periodMonth ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const year = opts.year ?? now.getFullYear();
  const periodLabel =
    opts.reportType === "MONTHLY"
      ? month
      : opts.reportType === "ANNUAL"
        ? `${year}년`
        : now.toISOString().slice(0, 10);

  if (opts.watermark) drawWatermark(doc);

  drawCover(
    doc,
    opts.payload,
    opts.reportType,
    opts.branding,
    opts.whitelabel,
    periodLabel,
  );

  if (opts.reportType === "SPEC_SHEET" || opts.reportType === "CATALOG") {
    renderSpecSheet(doc, opts.payload, theme.accent);
  } else if (opts.reportType === "MONTHLY") {
    renderMonthly(doc, opts.payload, month, theme.accent);
  } else if (opts.reportType === "ANNUAL") {
    renderAnnual(doc, opts.payload, year, theme.accent);
  }

  renderDataMethodologyPage(doc, opts.payload, theme.accent, hasKrFont);
  drawFooter(doc, opts.whitelabel, opts.branding, 1);
  return doc.output("arraybuffer") as ArrayBuffer;
}

export async function buildMediaOwnerCatalogPdf(opts: {
  payloads: MediaOwnerReportPayload[];
  branding: BrandingProfile;
  whitelabel: MediaOwnerWhitelabelMode;
  watermark: boolean;
}): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKrFont = await ensureKrFontForServerPdf(doc);
  doc.setFont(krFontFamily(hasKrFont), "normal");
  const theme = THEMES[opts.branding.theme];

  for (let i = 0; i < opts.payloads.length; i++) {
    if (i > 0) doc.addPage();
    if (opts.watermark) drawWatermark(doc);
    drawCover(
      doc,
      opts.payloads[i]!,
      "CATALOG",
      opts.branding,
      opts.whitelabel,
      `카탈로그 ${i + 1}/${opts.payloads.length}`,
    );
    renderSpecSheet(doc, opts.payloads[i]!, theme.accent);
    renderDataMethodologyPage(doc, opts.payloads[i]!, theme.accent, hasKrFont);
    drawFooter(doc, opts.whitelabel, opts.branding, i + 1);
  }

  return doc.output("arraybuffer") as ArrayBuffer;
}
