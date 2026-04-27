import type { jsPDF } from "jspdf";
import {
  krFontFamily,
  registerNotoSansKrIfAvailable,
} from "@/lib/jspdf-register-noto-kr";
import {
  computeCampaignBaseStats,
  computeCampaignPlannerKpis,
  computeCampaignTotalAmount,
  type CampaignKpiBooking,
} from "@/lib/campaign-kpis";
import { aggregatePortfolioTraffic } from "@/lib/portfolio-traffic";

export type CompletionPdfSchedule = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  kind: string;
};

export type CompletionPdfProof = {
  imageUrl: string;
  caption: string | null;
};

export type CompletionPdfFinancial = {
  kind: string;
  title: string;
  amountKrw: number | null;
  status: string;
};

export type CompletionPdfMediaBooking = {
  title: string;
  mediaName: string;
  location: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  /** KPI 산출용 (선택) */
  dailyFootTraffic?: number | null;
  region?: string | null;
  trafficPattern?: {
    hourly?: number[];
    weekly?: number[];
    monthly?: number[];
  } | null;
};

export type BuildCampaignCompletionPdfParams = {
  campaignName: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes: string | null;
  scheduleEvents: CompletionPdfSchedule[];
  proofPhotos: CompletionPdfProof[];
  financialDocs: CompletionPdfFinancial[];
  mediaBookings?: CompletionPdfMediaBooking[];
  /** 캠페인 명시 기간 (mediaBookings/scheduleEvents 가 없을 때 표지/요약에 사용) */
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

// ── 디자인 토큰 (검정 + 주황 #FF6600 통일) ──
const C_BLACK: [number, number, number] = [0, 0, 0];
const C_WHITE: [number, number, number] = [255, 255, 255];
const C_ACCENT: [number, number, number] = [255, 102, 0]; // #FF6600
const C_OFF: [number, number, number] = [245, 245, 245];
const C_GRAY: [number, number, number] = [115, 115, 115];
const C_GRAY_LIGHT: [number, number, number] = [200, 200, 200];

// A4 portrait
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 22;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ── 유틸 ──
function fmtKrwCompact(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000;
    const rounded = Math.round(eok * 10) / 10;
    return `₩${rounded.toString().replace(/\.0$/, "")}억`;
  }
  if (amount >= 10_000) {
    const man = Math.round(amount / 10_000);
    return `₩${man.toLocaleString("ko-KR")}만`;
  }
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function fmtDateKo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtDateShort(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function fmtMan(n: number): string {
  if (n <= 0) return "0";
  const man = n / 10_000;
  if (man < 1) return n.toLocaleString("ko-KR");
  if (man >= 100) return `${Math.round(man).toLocaleString("ko-KR")}만`;
  return `${(Math.round(man * 10) / 10).toString()}만`;
}

function periodOf(p: BuildCampaignCompletionPdfParams): {
  startsAt: Date | null;
  endsAt: Date | null;
} {
  if (p.startDate && p.endDate) {
    return {
      startsAt: p.startDate instanceof Date ? p.startDate : new Date(p.startDate),
      endsAt: p.endDate instanceof Date ? p.endDate : new Date(p.endDate),
    };
  }
  if (p.mediaBookings?.length) {
    const starts = p.mediaBookings.map((b) =>
      (b.startsAt instanceof Date ? b.startsAt : new Date(b.startsAt)).getTime(),
    );
    const ends = p.mediaBookings.map((b) =>
      (b.endsAt instanceof Date ? b.endsAt : new Date(b.endsAt)).getTime(),
    );
    return {
      startsAt: new Date(Math.min(...starts)),
      endsAt: new Date(Math.max(...ends)),
    };
  }
  if (p.scheduleEvents.length) {
    const starts = p.scheduleEvents.map((e) =>
      (e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt)).getTime(),
    );
    const ends = p.scheduleEvents.map((e) =>
      (e.endsAt instanceof Date ? e.endsAt : new Date(e.endsAt)).getTime(),
    );
    return {
      startsAt: new Date(Math.min(...starts)),
      endsAt: new Date(Math.max(...ends)),
    };
  }
  return { startsAt: null, endsAt: null };
}

// ── 페이지 헬퍼 ──
function setColor(
  doc: jsPDF,
  setter: "text" | "fill" | "draw",
  c: [number, number, number],
) {
  if (setter === "text") doc.setTextColor(c[0], c[1], c[2]);
  else if (setter === "fill") doc.setFillColor(c[0], c[1], c[2]);
  else doc.setDrawColor(c[0], c[1], c[2]);
}

function fillBg(doc: jsPDF, color: [number, number, number]) {
  setColor(doc, "fill", color);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function monoLabel(
  doc: jsPDF,
  fam: string,
  text: string,
  x: number,
  y: number,
  size = 8,
  color: [number, number, number] = C_ACCENT,
) {
  doc.setFont("courier", "bold");
  doc.setFontSize(size);
  setColor(doc, "text", color);
  // letter-spacing 흉내: 글자별로 출력하면 비효율 — 단순 brackets
  doc.text(`[ ${text.toUpperCase()} ]`, x, y);
  doc.setFont(fam, "normal");
}

function accentLine(
  doc: jsPDF,
  x1: number,
  y: number,
  x2: number,
  width = 0.6,
  color: [number, number, number] = C_ACCENT,
) {
  setColor(doc, "draw", color);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

// ── 표지 (page 1) — 검정 배경 풀블리드 ──
function drawCoverPage(
  doc: jsPDF,
  fam: string,
  hasKrFont: boolean,
  p: BuildCampaignCompletionPdfParams,
  totalPages: number,
) {
  fillBg(doc, C_BLACK);

  // 좌측 4mm 주황 액센트 바 (전체 높이)
  setColor(doc, "fill", C_ACCENT);
  doc.rect(0, 0, 4, PAGE_H, "F");

  // 상단 — 브랜드 + 페이지 인디케이터
  monoLabel(doc, fam, "THINKAD", MARGIN_X, 24, 9, C_ACCENT);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  setColor(doc, "text", [255, 255, 255]);
  doc.text("OOH MEDIA AGENCY", MARGIN_X, 30);

  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  setColor(doc, "text", [255, 255, 255]);
  doc.text(`01 / ${String(totalPages).padStart(2, "0")}`, PAGE_W - MARGIN_X, 24, {
    align: "right",
  });

  // 짧은 주황 가로선
  accentLine(doc, MARGIN_X, 66, MARGIN_X + 60, 1.0, C_ACCENT);

  // 보고서 라벨
  doc.setFont(fam, "normal");
  doc.setFontSize(11);
  setColor(doc, "text", [255, 255, 255]);
  doc.text("OOH 광고 성과 보고서", MARGIN_X, 78);

  // 캠페인명 (큰 타이포)
  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(28);
  setColor(doc, "text", C_WHITE);
  const titleLines = doc.splitTextToSize(
    p.campaignName || "캠페인명",
    CONTENT_W,
  );
  let titleY = 100;
  for (const line of titleLines.slice(0, 3)) {
    doc.text(line, MARGIN_X, titleY);
    titleY += 12;
  }

  // FOR · 클라이언트
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  setColor(doc, "text", C_ACCENT);
  doc.text(
    `FOR · ${p.clientCompany || "—"}`,
    MARGIN_X,
    Math.max(titleY + 6, 130),
  );

  // 메타 4 컬럼 (하단)
  const metaY = 200;
  const colW = CONTENT_W / 4;
  const period = periodOf(p);
  const periodText =
    period.startsAt && period.endsAt
      ? `${fmtDateShort(period.startsAt)} ~\n${fmtDateShort(period.endsAt)}`
      : "—";
  const totalAmount = computeCampaignTotalAmount(p.financialDocs);
  const cells: { label: string; value: string; accent?: boolean }[] = [
    { label: "기간", value: periodText },
    { label: "매체 수", value: `${p.mediaBookings?.length ?? 0}` },
    {
      label: "총 예산",
      value: totalAmount > 0 ? fmtKrwCompact(totalAmount) : "—",
      accent: true,
    },
    {
      label: "발행일",
      value: new Date()
        .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" })
        .replace(/\. /g, ".")
        .replace(/\.$/, ""),
    },
  ];

  // 상단 구분선
  accentLine(doc, MARGIN_X, metaY - 8, PAGE_W - MARGIN_X, 0.3, [80, 80, 80]);

  cells.forEach((cell, i) => {
    const cx = MARGIN_X + colW * i;
    monoLabel(doc, fam, cell.label, cx, metaY, 7, [180, 180, 180]);
    doc.setFont(fam, hasKrFont ? "normal" : "bold");
    doc.setFontSize(13);
    setColor(doc, "text", cell.accent ? C_ACCENT : C_WHITE);
    const lines = cell.value.split("\n");
    let cy = metaY + 7;
    for (const ln of lines) {
      doc.text(ln, cx, cy);
      cy += 6;
    }
  });

  // 푸터
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  setColor(doc, "text", [180, 180, 180]);
  doc.text(
    "THINKAD · 02-515-2772 · mannote@tkad.co.kr",
    MARGIN_X,
    PAGE_H - 16,
  );
  doc.text("© 2026 THINKAD", PAGE_W - MARGIN_X, PAGE_H - 16, {
    align: "right",
  });
}

// ── Executive Summary (page 2) — 흰 배경 ──
function drawExecutiveSummary(
  doc: jsPDF,
  fam: string,
  hasKrFont: boolean,
  p: BuildCampaignCompletionPdfParams,
) {
  // 상단 검정 헤더 바
  setColor(doc, "fill", C_BLACK);
  doc.rect(0, 0, PAGE_W, 18, "F");

  monoLabel(doc, fam, "EXECUTIVE SUMMARY", MARGIN_X, 12, 9, C_ACCENT);
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  setColor(doc, "text", C_WHITE);
  doc.text("02", PAGE_W - MARGIN_X, 12, { align: "right" });

  // KPI 계산 (lib 공유)
  const kpiBookings: CampaignKpiBooking[] = (p.mediaBookings ?? []).map((b) => ({
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    dailyFootTraffic: b.dailyFootTraffic ?? null,
    type: b.type,
    region: b.region ?? null,
    location: b.location,
  }));
  const stats = computeCampaignBaseStats(kpiBookings);
  const totalAmount = computeCampaignTotalAmount(p.financialDocs);
  const plannerKpis = computeCampaignPlannerKpis(stats, totalAmount);

  // 한 줄 요약 (템플릿 — AI X)
  let y = 38;
  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(15);
  setColor(doc, "text", C_BLACK);
  const oneLine =
    stats && plannerKpis
      ? `총 ${fmtMan(plannerKpis.totalImp)}회 노출, ${stats.mediaCount}개 매체로 ${stats.totalDays}일간 집행`
      : "캠페인 KPI 데이터 부족 — 매체·예산 정보를 확인해주세요.";
  for (const line of doc.splitTextToSize(oneLine, CONTENT_W)) {
    doc.text(line, MARGIN_X, y);
    y += 8;
  }
  y += 8;

  // KPI 그리드 (8 + 총예산) — 산식은 lib/campaign-kpis.ts 그대로
  const cardGap = 4;
  const kpiCardH = 26;
  const colW = (CONTENT_W - cardGap * 3) / 4;
  type Card = {
    label: string;
    value: string;
    suffix?: string;
    bg: [number, number, number];
    fg: [number, number, number];
    labelFg: [number, number, number];
  };
  const cards: Card[] = [
    {
      label: "집행 매체",
      value: stats ? `${stats.mediaCount}` : "—",
      suffix: "개",
      bg: C_WHITE,
      fg: C_BLACK,
      labelFg: C_GRAY,
    },
    {
      label: "집행 기간",
      value: stats ? `${stats.totalDays}` : "—",
      suffix: "일",
      bg: C_WHITE,
      fg: C_BLACK,
      labelFg: C_GRAY,
    },
    {
      label: "총 노출",
      value: plannerKpis ? fmtMan(plannerKpis.totalImp) : "—",
      suffix: "회",
      bg: C_BLACK,
      fg: C_ACCENT,
      labelFg: C_ACCENT,
    },
    {
      label: "도달인 추정",
      value: plannerKpis ? fmtMan(plannerKpis.reach) : "—",
      suffix: "명",
      bg: C_WHITE,
      fg: C_BLACK,
      labelFg: C_GRAY,
    },
    {
      label: "코어 도달률",
      value: plannerKpis ? `${plannerKpis.reachCorePct}` : "—",
      suffix: "%",
      bg: C_WHITE,
      fg: C_BLACK,
      labelFg: C_GRAY,
    },
    {
      label: "확장 도달률",
      value: plannerKpis ? `${plannerKpis.reachExtendedPct}` : "—",
      suffix: "%",
      bg: C_WHITE,
      fg: C_BLACK,
      labelFg: C_GRAY,
    },
    {
      label: "BLENDED CPM",
      value:
        plannerKpis?.blendedCpm != null
          ? `₩${plannerKpis.blendedCpm.toLocaleString("ko-KR")}`
          : "—",
      bg: C_BLACK,
      fg: C_ACCENT,
      labelFg: C_ACCENT,
    },
    {
      label: "ROI 효율",
      value: plannerKpis?.roiExpected != null ? fmtMan(plannerKpis.roiExpected) : "—",
      suffix: "회/1억",
      bg: C_BLACK,
      fg: C_ACCENT,
      labelFg: C_ACCENT,
    },
  ];

  // 4x2 그리드
  for (let i = 0; i < cards.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = MARGIN_X + col * (colW + cardGap);
    const cy = y + row * (kpiCardH + cardGap);
    const c = cards[i];
    setColor(doc, "fill", c.bg);
    doc.rect(cx, cy, colW, kpiCardH, "F");
    setColor(doc, "draw", C_BLACK);
    doc.setLineWidth(0.6);
    doc.rect(cx, cy, colW, kpiCardH, "S");
    monoLabel(doc, fam, c.label, cx + 4, cy + 7, 6.5, c.labelFg);
    doc.setFont(fam, hasKrFont ? "normal" : "bold");
    doc.setFontSize(13.5);
    setColor(doc, "text", c.fg);
    doc.text(c.value, cx + 4, cy + 19);
    if (c.suffix) {
      const valW = doc.getTextWidth(c.value);
      doc.setFontSize(7.5);
      setColor(doc, "text", c.fg);
      doc.text(c.suffix, cx + 4 + valW + 1.5, cy + 19);
    }
  }

  // 5번째 — 총 예산 (가로 풀폭, 강조)
  const budgetY = y + 2 * (kpiCardH + cardGap);
  setColor(doc, "fill", C_BLACK);
  doc.rect(MARGIN_X, budgetY, CONTENT_W, kpiCardH, "F");
  setColor(doc, "draw", C_BLACK);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN_X, budgetY, CONTENT_W, kpiCardH, "S");
  monoLabel(doc, fam, "총 예산", MARGIN_X + 6, budgetY + 9, 7, C_ACCENT);
  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(22);
  setColor(doc, "text", C_ACCENT);
  doc.text(
    totalAmount > 0 ? fmtKrwCompact(totalAmount) : "—",
    MARGIN_X + 6,
    budgetY + 19,
  );

  y = budgetY + kpiCardH + 16;

  // 매체 유형 분포 (미니) — 집행 매체 기준 카운트
  const byType: Record<string, number> = {};
  for (const b of p.mediaBookings ?? []) {
    const t = (b.type ?? "기타").toString();
    byType[t] = (byType[t] ?? 0) + 1;
  }
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (typeEntries.length > 0) {
    monoLabel(doc, fam, "매체 유형 분포", MARGIN_X, y, 8, C_ACCENT);
    y += 4;
    accentLine(doc, MARGIN_X, y, MARGIN_X + 60, 0.6, C_ACCENT);
    y += 8;
    const total = typeEntries.reduce((s, [, c]) => s + c, 0) || 1;
    const barW = CONTENT_W;
    const rowH = 9;
    for (let i = 0; i < typeEntries.length; i++) {
      const [label, count] = typeEntries[i];
      const pct = Math.round((count / total) * 100);
      const cy = y + i * (rowH + 2);
      // background
      setColor(doc, "fill", C_OFF);
      doc.rect(MARGIN_X, cy, barW, rowH, "F");
      setColor(doc, "draw", C_BLACK);
      doc.setLineWidth(0.4);
      doc.rect(MARGIN_X, cy, barW, rowH, "S");
      // fill
      setColor(doc, "fill", i === 0 ? C_ACCENT : C_BLACK);
      doc.rect(MARGIN_X, cy, Math.max(1, (barW * pct) / 100), rowH, "F");
      // text
      doc.setFont(fam, hasKrFont ? "normal" : "bold");
      doc.setFontSize(8.5);
      setColor(doc, "text", C_WHITE);
      doc.text(`${label}`, MARGIN_X + 2.5, cy + 6.5);
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      setColor(doc, "text", C_WHITE);
      doc.text(`${count}개 · ${pct}%`, PAGE_W - MARGIN_X - 2.5, cy + 6.5, {
        align: "right",
      });
    }
    y += typeEntries.length * (rowH + 2) + 10;
  }

  // 노출 패턴 미니(시간대·요일·월별) — 매체 trafficPattern + 유형/지역 추정 기반 가중평균
  const bookingsForTraffic = (p.mediaBookings ?? []).map((b) => ({
    type: b.type ?? "digital",
    region: b.region ?? "national",
    dailyFootTraffic: b.dailyFootTraffic ?? 0,
    trafficPattern: b.trafficPattern ?? null,
  }));
  const trafficAgg =
    bookingsForTraffic.length > 0
      ? aggregatePortfolioTraffic(bookingsForTraffic)
      : null;

  const drawMiniBars = (
    title: string,
    values: number[],
    x: number,
    y0: number,
    w: number,
    h: number,
    peakLabel: string,
    peakIdx: number,
    labelEvery: number,
    labels: string[],
  ) => {
    // frame
    setColor(doc, "draw", C_BLACK);
    doc.setLineWidth(0.6);
    doc.rect(x, y0, w, h, "S");
    // title
    monoLabel(doc, fam, title, x + 4, y0 + 8, 7, C_GRAY);
    // peak chip
    setColor(doc, "fill", C_BLACK);
    doc.rect(x + w - 56, y0 + 2.5, 52, 7, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    setColor(doc, "text", C_ACCENT);
    doc.text(peakLabel, x + w - 30, y0 + 7.5, { align: "center" });

    const max = Math.max(...values, 0.0001);
    const barY = y0 + 14;
    const barH = h - 22;
    const n = values.length;
    const gap = 0.6;
    const bw = (w - 8 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const v = values[i];
      const hh = Math.max(1, (v / max) * barH);
      const bx = x + 4 + i * (bw + gap);
      const by = barY + (barH - hh);
      setColor(doc, "fill", i === peakIdx ? C_ACCENT : C_BLACK);
      doc.rect(bx, by, bw, hh, "F");
    }
    // labels row
    doc.setFont("courier", "normal");
    doc.setFontSize(6.5);
    setColor(doc, "text", C_GRAY);
    const labY = y0 + h - 4;
    for (let i = 0; i < labels.length; i++) {
      if (labelEvery > 1 && i % labelEvery !== 0) continue;
      const bx = x + 4 + i * (bw + gap) + bw / 2;
      doc.text(labels[i] ?? "", bx, labY, { align: "center" });
    }
  };

  const idxMax = (arr: number[]) => {
    let idx = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
    return idx;
  };

  if (trafficAgg) {
    monoLabel(doc, fam, "노출 패턴 (요약)", MARGIN_X, y, 8, C_ACCENT);
    y += 4;
    accentLine(doc, MARGIN_X, y, MARGIN_X + 60, 0.6, C_ACCENT);
    y += 8;

    const blockH = 44;
    const gap = 4;
    const colW = (CONTENT_W - gap * 2) / 3;
    const peakHour = idxMax(trafficAgg.hourly);
    const peakDay = idxMax(trafficAgg.weekly);
    const peakMonth = idxMax(trafficAgg.monthly);
    const hourLabels = Array.from({ length: 24 }, (_, i) =>
      i % 3 === 0 ? String(i) : "",
    );
    const weekdayKo = ["월", "화", "수", "목", "금", "토", "일"];
    const monthLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));

    drawMiniBars(
      "시간대 (24h)",
      trafficAgg.hourly,
      MARGIN_X,
      y,
      colW,
      blockH,
      `피크 ${peakHour}시`,
      peakHour,
      1,
      hourLabels,
    );
    drawMiniBars(
      "요일",
      trafficAgg.weekly,
      MARGIN_X + colW + gap,
      y,
      colW,
      blockH,
      `피크 ${weekdayKo[peakDay]}요일`,
      peakDay,
      1,
      weekdayKo,
    );
    drawMiniBars(
      "월별",
      trafficAgg.monthly,
      MARGIN_X + (colW + gap) * 2,
      y,
      colW,
      blockH,
      `피크 ${monthLabels[peakMonth]}월`,
      peakMonth,
      1,
      monthLabels,
    );
    y += blockH + 14;
  }

  // 주요 매체 TOP 5
  monoLabel(doc, fam, "주요 매체 (TOP 5)", MARGIN_X, y, 8, C_ACCENT);
  y += 4;
  accentLine(doc, MARGIN_X, y, MARGIN_X + 60, 0.6, C_ACCENT);
  y += 8;

  const topMedia = (p.mediaBookings ?? []).slice(0, 5);
  if (topMedia.length === 0) {
    doc.setFont(fam, "normal");
    doc.setFontSize(10);
    setColor(doc, "text", C_GRAY);
    doc.text("등록된 매체 없음", MARGIN_X, y);
    y += 6;
  } else {
    doc.setFont(fam, hasKrFont ? "normal" : "normal");
    doc.setFontSize(10);
    for (let i = 0; i < topMedia.length; i++) {
      const m = topMedia[i];
      const idx = String(i + 1).padStart(2, "0");
      // 인덱스 (모노 주황)
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      setColor(doc, "text", C_ACCENT);
      doc.text(idx, MARGIN_X, y);
      // 이름
      doc.setFont(fam, hasKrFont ? "normal" : "bold");
      doc.setFontSize(11);
      setColor(doc, "text", C_BLACK);
      doc.text(m.mediaName || "—", MARGIN_X + 12, y);
      // 우측: 위치 / 기간
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      setColor(doc, "text", C_GRAY);
      const right = `${m.location || "—"} · ${fmtDateShort(m.startsAt)}~${fmtDateShort(m.endsAt)}`;
      doc.text(right, PAGE_W - MARGIN_X, y, { align: "right" });
      y += 6.5;
      // 행 구분선
      accentLine(doc, MARGIN_X, y, PAGE_W - MARGIN_X, 0.2, C_GRAY_LIGHT);
      y += 3;
    }
  }
}

// ── 본문 헤딩 ──
function writeSectionHeader(
  doc: jsPDF,
  fam: string,
  label: string,
  y: number,
): number {
  // 4mm 주황 액센트 바 (좌측)
  setColor(doc, "fill", C_ACCENT);
  doc.rect(MARGIN_X, y - 4, 1.5, 8, "F");
  monoLabel(doc, fam, label, MARGIN_X + 4, y + 1, 9, C_BLACK);
  return y + 10;
}

// ── 본문 (page 3+) ──
function drawBody(
  doc: jsPDF,
  fam: string,
  hasKrFont: boolean,
  p: BuildCampaignCompletionPdfParams,
): void {
  let y = 28;
  const pageBottom = PAGE_H - 22; // 푸터 공간 확보
  const ensureSpace = (need: number) => {
    if (y + need > pageBottom) {
      doc.addPage();
      y = 28;
    }
  };
  const drawTable = (args: {
    title: string;
    columns: { key: string; label: string; w: number }[];
    rows: Record<string, string>[];
  }) => {
    ensureSpace(16);
    y = writeSectionHeader(doc, fam, args.title, y);
    const x0 = MARGIN_X;
    const rowH = 8;
    // header
    ensureSpace(rowH + 6);
    setColor(doc, "fill", C_BLACK);
    doc.rect(x0, y - 4, CONTENT_W, rowH, "F");
    setColor(doc, "draw", C_BLACK);
    doc.setLineWidth(0.6);
    doc.rect(x0, y - 4, CONTENT_W, rowH, "S");
    let cx = x0;
    for (const col of args.columns) {
      monoLabel(doc, fam, col.label, cx + 2.5, y + 1.5, 6.5, C_ACCENT);
      cx += col.w;
      if (cx < x0 + CONTENT_W) {
        setColor(doc, "draw", C_WHITE);
        doc.setLineWidth(0.3);
        doc.line(cx, y - 4, cx, y - 4 + rowH);
      }
    }
    y += rowH;
    // rows
    doc.setFont(fam, hasKrFont ? "normal" : "normal");
    doc.setFontSize(8.5);
    for (let i = 0; i < args.rows.length; i++) {
      ensureSpace(rowH + 2);
      const ry = y - 4;
      setColor(doc, "fill", i % 2 === 0 ? C_WHITE : C_OFF);
      doc.rect(x0, ry, CONTENT_W, rowH, "F");
      setColor(doc, "draw", C_BLACK);
      doc.setLineWidth(0.4);
      doc.rect(x0, ry, CONTENT_W, rowH, "S");
      cx = x0;
      for (const col of args.columns) {
        const txt = args.rows[i][col.key] ?? "—";
        setColor(doc, "text", C_BLACK);
        const clipped = doc.splitTextToSize(txt, col.w - 4)[0] ?? "";
        doc.text(clipped, cx + 2.5, y + 1.5);
        cx += col.w;
      }
      y += rowH;
    }
    y += 8;
  };

  // 캠페인 정보
  y = writeSectionHeader(doc, fam, "캠페인 정보", y);
  doc.setFont(fam, "normal");
  doc.setFontSize(10);
  setColor(doc, "text", C_BLACK);
  const period = periodOf(p);
  const periodStr =
    period.startsAt && period.endsAt
      ? `${fmtDateKo(period.startsAt)} ~ ${fmtDateKo(period.endsAt)}`
      : "—";
  const infoLines = [
    `캠페인명: ${p.campaignName}`,
    `고객사: ${p.clientCompany} / 담당: ${p.clientName}`,
    `이메일: ${p.clientEmail}`,
    `상태: ${p.status}`,
    `기간: ${periodStr}`,
  ];
  for (const line of infoLines) {
    for (const w of doc.splitTextToSize(line, CONTENT_W)) {
      ensureSpace(5.5);
      doc.text(w, MARGIN_X, y);
      y += 5.5;
    }
  }
  if (p.notes?.trim()) {
    y += 2;
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    setColor(doc, "text", C_GRAY);
    ensureSpace(6);
    doc.text("[ 비고 ]", MARGIN_X, y);
    y += 5;
    doc.setFont(fam, "normal");
    doc.setFontSize(10);
    setColor(doc, "text", C_BLACK);
    for (const w of doc.splitTextToSize(p.notes.trim(), CONTENT_W)) {
      ensureSpace(5.5);
      doc.text(w, MARGIN_X, y);
      y += 5.5;
    }
  }
  y += 10;

  // 예약 매체
  const bookings = p.mediaBookings ?? [];
  if (bookings.length > 0) {
    drawTable({
      title: "예약 매체",
      columns: [
        { key: "media", label: "매체명", w: 54 },
        { key: "location", label: "위치", w: 56 },
        { key: "period", label: "기간", w: 46 },
        { key: "daily", label: "일유동", w: 22 },
        { key: "status", label: "상태", w: 22 },
      ],
      rows: bookings.map((b) => ({
        media: b.mediaName || "—",
        location: b.location || "—",
        period: `${fmtDateShort(b.startsAt)}~${fmtDateShort(b.endsAt)}`,
        daily: b.dailyFootTraffic ? `${b.dailyFootTraffic.toLocaleString("ko-KR")}` : "—",
        status: b.status || "—",
      })),
    });
  }


  // 송출·일정
  if (p.scheduleEvents.length > 0) {
    drawTable({
      title: "송출 · 일정",
      columns: [
        { key: "title", label: "제목", w: 96 },
        { key: "kind", label: "구분", w: 28 },
        { key: "period", label: "기간", w: 66 },
      ],
      rows: p.scheduleEvents.map((ev) => ({
        title: ev.title,
        kind: ev.kind,
        period: `${fmtDateShort(ev.startsAt)}~${fmtDateShort(ev.endsAt)}`,
      })),
    });
  }

  // 송출 증빙 (URL 만)
  if (p.proofPhotos.length > 0) {
    drawTable({
      title: "송출 증빙",
      columns: [
        { key: "url", label: "URL", w: 128 },
        { key: "caption", label: "캡션", w: 72 },
      ],
      rows: p.proofPhotos.slice(0, 20).map((ph) => ({
        url: ph.imageUrl,
        caption: ph.caption ?? "",
      })),
    });
  }


  // 견적·계약·청구
  if (p.financialDocs.length > 0) {
    drawTable({
      title: "견적 · 계약 · 청구",
      columns: [
        { key: "kind", label: "구분", w: 32 },
        { key: "title", label: "항목", w: 98 },
        { key: "amount", label: "금액", w: 40 },
        { key: "status", label: "상태", w: 30 },
      ],
      rows: p.financialDocs.map((d) => ({
        kind: d.kind,
        title: d.title,
        amount: d.amountKrw != null ? fmtKrwCompact(d.amountKrw) : "—",
        status: d.status,
      })),
    });
    const total = computeCampaignTotalAmount(p.financialDocs);
    if (total > 0) {
      ensureSpace(10);
      setColor(doc, "fill", C_BLACK);
      doc.rect(MARGIN_X, y - 4, CONTENT_W, 9, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      setColor(doc, "text", C_ACCENT);
      doc.text("[ 합계 ]", MARGIN_X + 4, y + 2);
      doc.setFont(fam, hasKrFont ? "normal" : "bold");
      doc.setFontSize(10);
      setColor(doc, "text", C_ACCENT);
      doc.text(fmtKrwCompact(total), PAGE_W - MARGIN_X - 4, y + 2, {
        align: "right",
      });
      y += 14;
    }
  }

  // 마지막 디스클레이머
  ensureSpace(12);
  y += 4;
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  setColor(doc, "text", C_GRAY);
  doc.text(
    "// 본 보고서는 관리 시스템 데이터(매체/일정/문서)를 기준으로 생성되었습니다.",
    MARGIN_X,
    y,
  );
}

// ── 모든 페이지 푸터 (page 2+) ──
function drawFooters(doc: jsPDF, fam: string) {
  const total = doc.getNumberOfPages();
  // 표지(page 1) 는 자체 푸터를 따로 그리므로 스킵.
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    accentLine(doc, MARGIN_X, PAGE_H - 14, PAGE_W - MARGIN_X, 0.3, [
      200, 200, 200,
    ]);
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    setColor(doc, "text", C_GRAY);
    doc.text(
      "THINKAD · 02-515-2772 · mannote@tkad.co.kr",
      MARGIN_X,
      PAGE_H - 9,
    );
    doc.setFont("courier", "bold");
    doc.text(
      `${String(p).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
      PAGE_W - MARGIN_X,
      PAGE_H - 9,
      { align: "right" },
    );
    // 좌측 4mm 주황 마커 (책갈피 톤)
    setColor(doc, "fill", C_ACCENT);
    doc.rect(0, PAGE_H - 14, 4, 8, "F");
  }
}

export async function createCampaignCompletionPdfDoc(
  p: BuildCampaignCompletionPdfParams,
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKrFont = registerNotoSansKrIfAvailable(doc);
  const fam = krFontFamily(hasKrFont);

  // page 1: 표지 (총 페이지 수는 끝에서 갱신해야 정확하지만, 1+1+본문 추정으로 미리)
  // → 표지의 NN 부분은 estimate. 본문 페이지 추가 후 표지를 다시 그릴 수도 있으나
  //   시각적 영향이 크지 않아 finalize 단계에서 page 1 는 다시 그리지 않음.
  drawCoverPage(doc, fam, hasKrFont, p, 0); // 0 → finalize 후 갱신

  // page 2: Executive Summary
  doc.addPage();
  drawExecutiveSummary(doc, fam, hasKrFont, p);

  // page 3+: 본문
  doc.addPage();
  drawBody(doc, fam, hasKrFont, p);

  // 푸터 (page 2부터)
  drawFooters(doc, fam);

  // 표지의 페이지 인디케이터 갱신 — 다시 그림 (이중 그리기 방지 위해 페이지 1 만 부분 덮기)
  doc.setPage(1);
  const totalPages = doc.getNumberOfPages();
  // 우측 상단의 "01 / NN" 부분만 새로 덮어쓰기 (검정 배경)
  setColor(doc, "fill", C_BLACK);
  doc.rect(PAGE_W - MARGIN_X - 30, 18, 30, 8, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  setColor(doc, "text", C_WHITE);
  doc.text(
    `01 / ${String(totalPages).padStart(2, "0")}`,
    PAGE_W - MARGIN_X,
    24,
    { align: "right" },
  );

  return doc;
}

export async function campaignCompletionPdfToBuffer(
  p: BuildCampaignCompletionPdfParams,
): Promise<Buffer> {
  const doc = await createCampaignCompletionPdfDoc(p);
  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
