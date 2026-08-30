import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { jsPDF } from "jspdf";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import {
  catalogPriceFieldToWon,
  mediaDetailPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { fetchStaticMapDataUrl } from "@/lib/static-map";
import {
  krFontFamily,
  ensureKrFontForServerPdf,
} from "@/lib/jspdf-register-noto-kr";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";
import {
  dataUrlImageFormat,
  loadProposalGalleryImage,
  loadProposalHeroImage,
} from "@/lib/export-media-images";
import {
  resolveTrafficPattern,
  buildInsights,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";
import { buildMediaProposalOverviewRows } from "@/lib/media-proposal-pdf-spec";

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 16;
const CW = PAGE_W - MX * 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Bump when PDF layout/font logic changes (invalidates stale cache). */
const CACHE_VERSION = "v5-qp-hermes-p3";

/** qp 각진 카드 — 플래너·견적 PDF와 동일 */
const R = 0;
const SECTION_BAR_W = 1.6;
const FOOTER_H = 24;
const HEADER_RULE_H = 1.2;

/** Quiet Professional — 흑백 + 브랜드 액센트 1종 (lib/brand-palette.ts) */
const ACCENT: [number, number, number] = [255, 98, 0];
const ACCENT_DK: [number, number, number] = [194, 78, 0];
const ACCENT_SOFT: [number, number, number] = [255, 243, 232];
const ON_ACCENT_MUTED: [number, number, number] = [255, 236, 220];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const FAINT: [number, number, number] = [156, 163, 175];
const LINE: [number, number, number] = [228, 230, 236];
const PANEL: [number, number, number] = [248, 249, 251];
const CHART_BAR_SOFT: [number, number, number] = [255, 210, 180];
const WHITE: [number, number, number] = [255, 255, 255];

const CONTACT = {
  tel: "02-515-2772",
  email: "sales@tkad.co.kr",
  site: "app.tkad.co.kr",
};

export type GenerateMediaProposalOptions = {
  media: MediaItem;
  isKo?: boolean;
  /** PRO: CPM·노출·도달 등 성과 지표 포함 */
  includeProDetails?: boolean;
  /** DB Media.trafficPattern (JSONB) — 없으면 매체 유형 평균 추정 */
  trafficPattern?: StoredTrafficPattern | null;
};

function proposalsCacheDir(): string {
  return join(tmpdir(), "proposals");
}
function cachePath(mediaId: string, includeProDetails: boolean): string {
  const tier = includeProDetails ? "pro" : "basic";
  return join(proposalsCacheDir(), `${mediaId}-${tier}-${CACHE_VERSION}.pdf`);
}
async function readCacheIfFresh(path: string): Promise<Buffer | null> {
  try {
    const st = await stat(path);
    if (Date.now() - st.mtimeMs > CACHE_TTL_MS) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}
async function writeCache(path: string, buf: Buffer): Promise<void> {
  await mkdir(proposalsCacheDir(), { recursive: true });
  await writeFile(path, buf);
}

function setFont(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  style: "normal" | "bold",
) {
  const weight = hasKr ? style : style === "bold" ? "bold" : "normal";
  try {
    doc.setFont(fam, weight);
  } catch {
    try {
      doc.setFont(fam, "normal");
    } catch {
      doc.setFont("helvetica", weight === "bold" ? "bold" : "normal");
    }
  }
}

/** 페이지 머리말/꼬리말 (라이트) */
function drawPageChrome(doc: jsPDF, fam: string, hasKr: boolean) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MX, 12, PAGE_W - MX, 12);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...FAINT);
  doc.text("THINKAD · 매체 제안서", MX, 9);
  doc.text(CONTACT.site, PAGE_W - MX, 9, { align: "right" });
}

function addPageIfNeeded(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  y: number,
  need = 18,
  reserveFooter = false,
): number {
  const bottom = reserveFooter ? PAGE_H - FOOTER_H - 4 : PAGE_H - 14;
  if (y > bottom - need) {
    doc.addPage();
    drawPageChrome(doc, fam, hasKr);
    return 22;
  }
  return y;
}

function drawProposalHeader(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  opts: {
    logo: string | null;
    isKo: boolean;
    issuedStr: string;
    mediaIdShort: string;
  },
): number {
  const top = 10;
  if (opts.logo) {
    try {
      doc.addImage(opts.logo, "PNG", MX, top, 22, 13);
    } catch {
      /* skip */
    }
  }
  const textX = MX + (opts.logo ? 25 : 0);
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("THINK", textX, top + 5);
  const thinkW = doc.getTextWidth("THINK");
  doc.setTextColor(...ACCENT);
  doc.text("AD", textX + thinkW, top + 5);

  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(opts.isKo ? "매체 제안서" : "Media Proposal", textX, top + 12);

  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${opts.isKo ? "발행일" : "Issued"}  ${opts.issuedStr}`, PAGE_W - MX, top + 4, {
    align: "right",
  });
  doc.text(
    `${opts.isKo ? "매체 ID" : "Media ID"}  ${opts.mediaIdShort}`,
    PAGE_W - MX,
    top + 9,
    { align: "right" },
  );

  const ruleY = top + 17;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MX, ruleY, PAGE_W - MX, ruleY);
  doc.setFillColor(...ACCENT);
  doc.rect(MX, ruleY + 0.15, CW, HEADER_RULE_H, "F");
  return ruleY + HEADER_RULE_H + 5;
}

function panelRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: "F" | "FD" | "D" | "S" = "FD",
) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, R, R, mode);
}

function sectionTitle(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  label: string,
  y: number,
): number {
  y = addPageIfNeeded(doc, fam, hasKr, y, 14);
  doc.setFillColor(...ACCENT);
  doc.rect(MX, y - 3.8, SECTION_BAR_W, 5.2, "F");
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(label, MX + SECTION_BAR_W + 2.4, y);
  return y + 7.5;
}

/** 미니 벡터 아이콘 (accent stroke) */
function icon(doc: jsPDF, kind: string, x: number, y: number) {
  doc.setDrawColor(...ACCENT);
  doc.setFillColor(...ACCENT);
  doc.setLineWidth(0.4);
  const c = (cx: number, cy: number, r: number, s: "S" | "F" = "S") =>
    doc.circle(cx, cy, r, s);
  switch (kind) {
    case "pin":
      c(x + 2, y - 1, 1.6);
      doc.triangle(x + 0.6, y - 0.2, x + 3.4, y - 0.2, x + 2, y + 2.4, "F");
      c(x + 2, y - 1, 0.6, "F");
      break;
    case "tag":
      doc.lines([[3, 0], [0, 3], [-3, 0], [0, -3]], x + 0.5, y - 1.6);
      c(x + 1.4, y - 0.7, 0.4, "F");
      break;
    case "ruler":
      doc.rect(x, y - 2.4, 4.2, 2.6, "S");
      doc.line(x + 1.4, y - 2.4, x + 1.4, y - 1.4);
      doc.line(x + 2.8, y - 2.4, x + 2.8, y - 1.4);
      break;
    case "clock":
      c(x + 2, y - 1, 2);
      doc.line(x + 2, y - 1, x + 2, y - 2.3);
      doc.line(x + 2, y - 1, x + 3, y - 0.6);
      break;
    case "users":
      c(x + 1.3, y - 1.6, 1);
      c(x + 3.2, y - 1.6, 1);
      doc.lines([[2.2, 0]], x + 0.2, y + 0.4);
      doc.lines([[2.2, 0]], x + 2.0, y + 0.4);
      break;
    case "bulb":
      c(x + 2, y - 1.4, 1.5);
      doc.line(x + 1.3, y + 0.4, x + 2.7, y + 0.4);
      break;
    case "calendar":
      doc.rect(x, y - 2.4, 4.2, 3.4, "S");
      doc.line(x, y - 1.4, x + 4.2, y - 1.4);
      break;
    case "won":
      doc.setFontSize(6.4);
      doc.setTextColor(...ACCENT);
      setFontSafe(doc);
      doc.text("₩", x + 0.6, y + 0.2);
      break;
    case "display":
      doc.rect(x, y - 2.4, 4.2, 2.6, "S");
      doc.line(x + 0.8, y - 1.8, x + 3.4, y - 1.8);
      doc.line(x + 2, y - 1.8, x + 2, y + 0.2);
      break;
    default:
      c(x + 2, y - 1, 1.4);
  }
}
function setFontSafe(doc: jsPDF) {
  try {
    doc.setFont(doc.getFont().fontName, "bold");
  } catch {
    /* ignore */
  }
}

/** 라벨/값 한 줄 (아이콘 포함) */
function specRow(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  ic: string,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
) {
  icon(doc, ic, x, y);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label, x + 7, y - 1.4);
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(value || "—", w - 7) as string[];
  doc.text(lines.slice(0, 2), x + 7, y + 2.6);
}

export { mediaProposalDownloadFilename } from "@/lib/media-proposal-filename";

export async function generateMediaProposalPdf(
  opts: GenerateMediaProposalOptions,
): Promise<Buffer> {
  const isKo = opts.isKo !== false;
  const includeProDetails = opts.includeProDetails === true;
  const { media } = opts;
  const cacheFile = cachePath(media.id, includeProDetails);
  const cached = await readCacheIfFresh(cacheFile);
  if (cached) return cached;

  const locale = isKo ? "ko-KR" : "en-US";
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKr = await ensureKrFontForServerPdf(doc);
  const fam = krFontFamily(hasKr);

  const issued = new Date();
  const issuedStr = issued.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const typeLabel =
    typeLabels[media.type as keyof typeof typeLabels]?.ko ?? media.type;
  const categoryLabel = [media.mediaMainCategory, media.mediaSubCategory]
    .filter(Boolean)
    .join(" · ") || typeLabel;
  const mediaTitle = isKo ? media.name : media.nameEn || media.name;
  const locationLine = isKo ? media.location : media.locationEn || media.location;
  const region = media.regionMain ?? media.region ?? media.location ?? "";
  const regionChips: string[] = (
    media.networkRegionLabels?.length
      ? media.networkRegionLabels
      : [media.regionMain, media.regionSub, media.district].filter(Boolean)
  ) as string[];

  const logo = loadThinkadLogoDataUrl();

  let y = drawProposalHeader(doc, fam, hasKr, {
    logo,
    isKo,
    issuedStr,
    mediaIdShort: media.id.slice(-10).toUpperCase(),
  });

  // ── 히어로: 16:9 cover crop + JPEG (sharp) ──
  const hero =
    media.sampleImages?.[0] != null
      ? await loadProposalHeroImage(media.sampleImages[0])
      : null;
  const heroH = 58;
  const heroW = (heroH * 16) / 9;
  const heroX = MX + (CW - heroW) / 2;
  if (hero) {
    try {
      doc.addImage(hero, dataUrlImageFormat(hero), heroX, y, heroW, heroH);
    } catch {
      doc.setFillColor(...PANEL);
      doc.rect(heroX, y, heroW, heroH, "F");
    }
  } else {
    doc.setFillColor(...ACCENT_DK);
    doc.rect(heroX, y, heroW, heroH, "F");
  }
  // 하단 그라디언트 오버레이 (반투명 띠 누적) — GState 미지원 환경이면 건너뜀
  try {
    const dg = doc as unknown as {
      GState?: new (o: object) => unknown;
      setGState?: (g: unknown) => void;
    };
    if (dg.GState && dg.setGState) {
      for (let i = 0; i < 18; i++) {
        doc.setFillColor(15, 15, 25);
        dg.setGState(new dg.GState({ opacity: 0.045 }));
        doc.rect(heroX, y + heroH - 22 + i, heroW, 22 - i, "F");
      }
      dg.setGState(new dg.GState({ opacity: 1 }));
    }
  } catch {
    /* overlay is cosmetic */
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(heroX, y, heroW, heroH, R, R, "S");
  // 유형 뱃지
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(7);
  const badgeW = doc.getTextWidth(typeLabel) + 7;
  doc.setFillColor(...ACCENT);
  doc.roundedRect(heroX + 5, y + heroH - 17, badgeW, 6, R, R, "F");
  doc.setTextColor(...WHITE);
  doc.text(typeLabel, heroX + 5 + badgeW / 2, y + heroH - 13, { align: "center" });
  // 매체명 오버레이
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(
    (doc.splitTextToSize(mediaTitle, heroW - 12) as string[]).slice(0, 1),
    heroX + 5,
    y + heroH - 4,
  );
  y += heroH + 10;

  // ── 매체 개요 (2열 카드) ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "매체 개요" : "Media Overview", y);
  const colW = (CW - 6) / 2;
  const monthlyImpr = media.impressions ?? null;
  const priceWon = catalogPriceFieldToWon(media.price);
  const { left: leftRows, right: rightRows } = buildMediaProposalOverviewRows(
    media,
    {
      isKo,
      locale,
      categoryLabel,
      locationLine,
      priceWon,
    },
  );
  const cardH = 4 * 11 + 8;
  y = addPageIfNeeded(doc, fam, hasKr, y, cardH + 4);
  doc.setFillColor(...WHITE);
  panelRect(doc, MX, y, CW, cardH, "FD");
  doc.setDrawColor(...LINE);
  doc.line(MX + colW + 3, y + 4, MX + colW + 3, y + cardH - 4);
  let ry = y + 9;
  for (let i = 0; i < 4; i++) {
    specRow(doc, fam, hasKr, leftRows[i]![0], leftRows[i]![1], leftRows[i]![2], MX + 5, ry, colW - 8);
    specRow(doc, fam, hasKr, rightRows[i]![0], rightRows[i]![1], rightRows[i]![2], MX + colW + 9, ry, colW - 8);
    ry += 11;
  }
  y += cardH + 10;

  // ── 위치 · 상권 (칩 + 주소 + 설명 + 지도) ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "위치 · 상권" : "Location & Trade Area", y);
  const mapDataUrl = await fetchStaticMapDataUrl({
    lat: media.lat,
    lng: media.lng,
    width: 600,
    height: 300,
    zoom: 15,
  });
  const mapH = 44;
  const taLines = doc.splitTextToSize(
    isKo
      ? `${region} 일대는 ${categoryLabel} 매체가 운영되는 상권으로, 유동인구가 꾸준히 형성되는 지역입니다. 본 매체는 ${locationLine}에 위치해 주변 상업·교통 동선의 노출 효과를 기대할 수 있습니다.`
      : `The ${region} area sees steady footfall around ${locationLine}, offering exposure along nearby commercial and transit routes.`,
    CW - 14,
  ) as string[];
  const locBlockH = 10 + taLines.length * 4.4 + mapH + (mapDataUrl ? 10 : 16);
  y = addPageIfNeeded(doc, fam, hasKr, y, locBlockH + 4);
  doc.setFillColor(...PANEL);
  panelRect(doc, MX, y, CW, locBlockH, "FD");

  let chipX = MX + 5;
  const chips = regionChips.slice(0, 4);
  for (const ch of chips.length ? chips : [region].filter(Boolean)) {
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(7);
    const cw = doc.getTextWidth(ch) + 6;
    doc.setFillColor(...ACCENT_SOFT);
    doc.roundedRect(chipX, y + 4, cw, 5.5, R, R, "F");
    doc.setTextColor(...ACCENT_DK);
    doc.text(ch, chipX + cw / 2, y + 7.8, { align: "center" });
    chipX += cw + 3;
  }

  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(
    (doc.splitTextToSize(locationLine, CW - 12) as string[]).slice(0, 2),
    MX + 5,
    y + 14,
  );
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`,
    PAGE_W - MX - 5,
    y + 14,
    { align: "right" },
  );

  let ty = y + 19;
  for (const ln of taLines) {
    doc.text(ln, MX + 5, ty);
    ty += 4.4;
  }

  const mapY = ty + 3;
  if (mapDataUrl) {
    try {
      doc.addImage(mapDataUrl, "PNG", MX + 5, mapY, CW - 10, mapH);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.25);
      doc.roundedRect(MX + 5, mapY, CW - 10, mapH, R, R, "S");
    } catch {
      doc.setFillColor(...WHITE);
      panelRect(doc, MX + 5, mapY, CW - 10, 12, "F");
      setFont(doc, fam, hasKr, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`, MX + 8, mapY + 7);
    }
  } else {
    doc.setFillColor(...WHITE);
    panelRect(doc, MX + 5, mapY, CW - 10, 12, "F");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`, MX + 8, mapY + 7);
  }
  y += locBlockH + 10;

  // ── 노출 예측 / 유동인구 분석 ──
  const { pattern, isEstimated } = resolveTrafficPattern(
    opts.trafficPattern ?? null,
    media.type,
    region,
  );
  const insights = buildInsights(pattern, isKo);
  y = sectionTitle(
    doc,
    fam,
    hasKr,
    `${isKo ? "노출 예측 · 유동인구" : "Exposure · Footfall"}${isEstimated ? (isKo ? " (추정)" : " (est.)") : ""}`,
    y,
  );
  // 막대그래프 (시간대별 24)
  const chartH = 26;
  const chartPadX = 5;
  const chartInnerW = CW - chartPadX * 2;
  y = addPageIfNeeded(doc, fam, hasKr, y, chartH + 28);
  doc.setFillColor(...PANEL);
  panelRect(doc, MX, y - 2, CW, chartH + 20, "FD");
  const chartInnerY = y + 2;
  const maxV = Math.max(...pattern.hourly, 0.0001);
  const barW = chartInnerW / 24;
  const peakIdx = pattern.hourly.indexOf(maxV);
  const baseY = chartInnerY + chartH;
  for (let h = 0; h < 24; h++) {
    const bh = (pattern.hourly[h]! / maxV) * (chartH - 2);
    if (h === peakIdx) doc.setFillColor(...ACCENT);
    else doc.setFillColor(...CHART_BAR_SOFT);
    doc.rect(MX + chartPadX + h * barW + 0.6, baseY - bh, barW - 1.2, bh, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MX + chartPadX, baseY, MX + chartPadX + chartInnerW, baseY);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...FAINT);
  for (const hh of [0, 6, 12, 18, 23]) {
    doc.text(String(hh), MX + chartPadX + hh * barW + barW / 2, baseY + 3.5, {
      align: "center",
    });
  }
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(isKo ? "시간대별 상대 유동 (0–23시)" : "Hourly relative footfall (0–23h)", MX + 5, chartInnerY - 0.5);
  y = baseY + 9;

  // 인사이트 3칸 + 월 노출
  const wkdayAvg = (pattern.weekly.slice(0, 5).reduce((a, b) => a + b, 0) / 5) || 0;
  const wkendAvg = (pattern.weekly.slice(5).reduce((a, b) => a + b, 0) / 2) || 0;
  const wkendVsWeekday =
    wkdayAvg > 0 ? Math.round((wkendAvg / wkdayAvg) * 100) : 100;
  const stats: Array<[string, string]> = [
    [isKo ? "피크 시간대" : "Peak hours", insights.peakHourLabel],
    [isKo ? "피크 요일" : "Peak day", insights.peakWeekdayLabel],
    [
      isKo ? "주말/주중" : "Weekend/Weekday",
      `${wkendVsWeekday}%`,
    ],
    [
      isKo ? "월 예상 노출" : "Monthly impressions",
      monthlyImpr ? monthlyImpr.toLocaleString(locale) : (isKo ? "협의" : "TBD"),
    ],
  ];
  const sCardW = (CW - 9) / 4;
  y = addPageIfNeeded(doc, fam, hasKr, y, 18);
  for (let i = 0; i < stats.length; i++) {
    const sx = MX + i * (sCardW + 3);
    doc.setFillColor(...WHITE);
    panelRect(doc, sx, y, sCardW, 15, "FD");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(...MUTED);
    doc.text((doc.splitTextToSize(stats[i]![0], sCardW - 4) as string[]).slice(0, 1), sx + 2.5, y + 4.5);
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(...ACCENT_DK);
    doc.text((doc.splitTextToSize(stats[i]![1], sCardW - 4) as string[]).slice(0, 2), sx + 2.5, y + 9.5);
  }
  y += 15 + 10;

  // ── 현장 사진 갤러리 ──
  const gallery = (media.sampleImages ?? []).slice(1, 4);
  if (gallery.length) {
    y = sectionTitle(doc, fam, hasKr, isKo ? "현장 사진" : "On-site Photos", y);
    const gH = 34;
    const gW = (gH * 4) / 3;
    const galleryGap = 4;
    const captionH = 5;
    const galleryRowW = gallery.length * gW + (gallery.length - 1) * galleryGap;
    const galleryStartX = MX + (CW - galleryRowW) / 2;
    y = addPageIfNeeded(doc, fam, hasKr, y, gH + captionH + 6);
    const galleryData = await Promise.all(
      gallery.map((url) => loadProposalGalleryImage(url)),
    );
    for (let i = 0; i < gallery.length; i++) {
      const data = galleryData[i];
      const gx = galleryStartX + i * (gW + galleryGap);
      doc.setFillColor(...WHITE);
      panelRect(doc, gx, y, gW, gH + captionH, "FD");
      doc.setFillColor(...ACCENT);
      doc.rect(gx, y, gW, 0.7, "F");
      if (data) {
        try {
          doc.addImage(data, dataUrlImageFormat(data), gx, y + 0.7, gW, gH - 0.7);
        } catch {
          doc.setFillColor(...PANEL);
          doc.rect(gx, y + 0.7, gW, gH - 0.7, "F");
        }
      } else {
        doc.setFillColor(...PANEL);
        doc.rect(gx, y + 0.7, gW, gH - 0.7, "F");
      }
      setFont(doc, fam, hasKr, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...ACCENT_DK);
      doc.text(
        `${String(i + 1).padStart(2, "0")}`,
        gx + 2.5,
        y + gH + 3.5,
      );
      setFont(doc, fam, hasKr, "normal");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(
        isKo ? "현장" : "Site",
        gx + gW - 2.5,
        y + gH + 3.5,
        { align: "right" },
      );
    }
    y += gH + captionH + 10;
  }

  // ── 단가 정보 ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "단가" : "Pricing", y);
  const periodKey = mediaDetailPricePeriodTranslationKey(media.pricePeriod);
  const periodLabel = isKo
    ? (({ month: "월", biweekly: "2주", week: "주", day: "일" } as const)[
        periodKey as "month" | "biweekly" | "week" | "day"
      ] ?? "월")
    : periodKey;
  const priceCols: Array<[string, string]> = [
    [`${periodLabel} ${isKo ? "단가" : ""}`.trim(), `₩${priceWon.toLocaleString(locale)}`],
    [isKo ? "3개월 집행" : "3 months", `₩${(priceWon * 3).toLocaleString(locale)}`],
    [isKo ? "6개월 집행" : "6 months", `₩${(priceWon * 6).toLocaleString(locale)}`],
  ];
  const pCardW = (CW - 8) / 3;
  y = addPageIfNeeded(doc, fam, hasKr, y, 26, true);
  for (let i = 0; i < 3; i++) {
    const px = MX + i * (pCardW + 4);
    const accent = i === 0;
    if (accent) doc.setFillColor(...ACCENT);
    else doc.setFillColor(...WHITE);
    panelRect(doc, px, y, pCardW, 20, accent ? "F" : "FD");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...(accent ? ON_ACCENT_MUTED : MUTED));
    doc.text(priceCols[i]![0], px + 4, y + 7);
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(accent ? WHITE : INK));
    doc.text((doc.splitTextToSize(priceCols[i]![1], pCardW - 8) as string[]).slice(0, 1), px + 4, y + 15);
  }
  y += 20 + 5;
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  y = addPageIfNeeded(doc, fam, hasKr, y, 10, true);
  doc.text(
    isKo
      ? "※ VAT 별도 · 장기 집행 시 할인 협의 가능합니다."
      : "※ VAT excluded · long-term discounts negotiable.",
    MX,
    y,
  );
  y += 4;
  if (includeProDetails) {
    const metrics: string[] = [];
    if (media.impressions != null)
      metrics.push(`${isKo ? "예상 노출" : "Impressions"} ${media.impressions.toLocaleString(locale)}`);
    if (media.cpm != null)
      metrics.push(`CPM ₩${Math.round(media.cpm).toLocaleString(locale)}`);
    if (media.reach != null)
      metrics.push(`${isKo ? "도달" : "Reach"} ${Math.round(media.reach).toLocaleString(locale)}`);
    if (metrics.length) {
      doc.setTextColor(...FAINT);
      doc.text(metrics.join("   ·   "), MX, y + 3);
      y += 6;
    }
  }

  // ── 푸터 ──
  const fy = PAGE_H - 24;
  doc.setFillColor(...ACCENT);
  doc.rect(0, fy, PAGE_W, 24, "F");
  doc.setFillColor(...ACCENT_DK);
  doc.rect(0, fy, PAGE_W, 0.8, "F");
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(isKo ? "THINKAD 문의" : "Contact THINKAD", MX, fy + 9);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...ON_ACCENT_MUTED);
  doc.text(`Tel. ${CONTACT.tel}    ${CONTACT.email}`, MX, fy + 15.5);
  doc.text(CONTACT.site, PAGE_W - MX, fy + 15.5, { align: "right" });
  doc.setFontSize(6.8);
  doc.setTextColor(255, 220, 195);
  doc.text(
    isKo
      ? "본 제안서는 참고용이며 실제 단가·집행 조건은 협의 가능합니다."
      : "This proposal is for reference; final pricing and terms are negotiable.",
    MX,
    fy + 20.5,
  );

  const buf = Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
  await writeCache(cacheFile, buf);
  return buf;
}
