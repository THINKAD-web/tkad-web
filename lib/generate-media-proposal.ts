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
import { fetchKakaoStaticMapBase64 } from "@/lib/kakao-static-map";
import {
  krFontFamily,
  ensureKrFontForServerPdf,
} from "@/lib/jspdf-register-noto-kr";
import { resolvePublicMediaImageUrl } from "@/lib/optimized-image-url";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";
import {
  resolveTrafficPattern,
  buildInsights,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 16;
const CW = PAGE_W - MX * 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Bump when PDF layout/font logic changes (invalidates stale cache). */
const CACHE_VERSION = "v3-light";

// 플래너 보고서와 통일된 라이트 팔레트
const VIOLET: [number, number, number] = [124, 58, 237];
const VIOLET_DK: [number, number, number] = [91, 33, 182];
const CYAN: [number, number, number] = [6, 182, 212];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const FAINT: [number, number, number] = [156, 163, 175];
const LINE: [number, number, number] = [229, 231, 235];
const PANEL: [number, number, number] = [249, 250, 251];
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

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}
async function fetchImageDataUrl(url: string): Promise<string | null> {
  const resolved = resolvePublicMediaImageUrl(url) ?? url;
  try {
    const res = await fetch(resolved, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mime = ct.split(";")[0]?.trim() || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
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
): number {
  if (y > PAGE_H - need) {
    doc.addPage();
    drawPageChrome(doc, fam, hasKr);
    return 22;
  }
  return y;
}

function sectionTitle(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  label: string,
  y: number,
): number {
  y = addPageIfNeeded(doc, fam, hasKr, y, 14);
  doc.setFillColor(...VIOLET);
  doc.rect(MX, y - 4, 2.6, 5.5, "F");
  doc.setFillColor(...CYAN);
  doc.rect(MX + 2.6, y - 4, 1.2, 5.5, "F");
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(label, MX + 7, y);
  return y + 8;
}

/** 미니 벡터 아이콘 (violet stroke) */
function icon(doc: jsPDF, kind: string, x: number, y: number) {
  doc.setDrawColor(...VIOLET);
  doc.setFillColor(...VIOLET);
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
      doc.setTextColor(...VIOLET);
      setFontSafe(doc);
      doc.text("₩", x + 0.6, y + 0.2);
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

  // ── 헤더: 좌측 보라 그라디언트 사이드바 ──
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, 2.5, PAGE_H, "F");
  doc.setFillColor(...CYAN);
  doc.rect(2.5, 0, 1.2, PAGE_H, "F");

  if (logo) {
    try {
      doc.addImage(logo, "PNG", MX, 9, 24, 14.5);
    } catch {
      /* skip */
    }
  }
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...VIOLET_DK);
  doc.text("THINKAD", MX + (logo ? 27 : 0), logo ? 15 : 14);
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(isKo ? "매체 제안서" : "Media Proposal", MX + (logo ? 27 : 0), logo ? 22 : 22);

  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${isKo ? "발행일" : "Issued"}  ${issuedStr}`, PAGE_W - MX, 13, {
    align: "right",
  });
  doc.text(`${isKo ? "매체 ID" : "Media ID"}  ${media.id.slice(-10).toUpperCase()}`, PAGE_W - MX, 18, {
    align: "right",
  });

  let y = 30;

  // ── 히어로: 대표 사진 + 오버레이 ──
  const hero =
    media.sampleImages?.[0] != null
      ? await fetchImageDataUrl(media.sampleImages[0])
      : null;
  const heroH = 58;
  if (hero) {
    try {
      doc.addImage(hero, guessImageFormat(hero), MX, y, CW, heroH);
    } catch {
      doc.setFillColor(...PANEL);
      doc.rect(MX, y, CW, heroH, "F");
    }
  } else {
    doc.setFillColor(...VIOLET_DK);
    doc.rect(MX, y, CW, heroH, "F");
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
        doc.rect(MX, y + heroH - 22 + i, CW, 22 - i, "F");
      }
      dg.setGState(new dg.GState({ opacity: 1 }));
    }
  } catch {
    /* overlay is cosmetic */
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(MX, y, CW, heroH, "S");
  // 유형 뱃지
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(7);
  const badgeW = doc.getTextWidth(typeLabel) + 7;
  doc.setFillColor(...VIOLET);
  doc.roundedRect(MX + 5, y + heroH - 17, badgeW, 6, 1.5, 1.5, "F");
  doc.setTextColor(...WHITE);
  doc.text(typeLabel, MX + 5 + badgeW / 2, y + heroH - 13, { align: "center" });
  // 매체명 오버레이
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(
    (doc.splitTextToSize(mediaTitle, CW - 12) as string[]).slice(0, 1),
    MX + 5,
    y + heroH - 4,
  );
  y += heroH + 8;

  // ── 매체 기본 정보 카드 (2열) ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "매체 기본 정보" : "Media Overview", y);
  const colW = (CW - 6) / 2;
  const leftRows: Array<[string, string, string]> = [
    ["pin", isKo ? "위치" : "Location", locationLine],
    ["tag", isKo ? "유형" : "Type", categoryLabel],
    ["ruler", isKo ? "규격" : "Size", media.size || media.resolution || "—"],
    ["clock", isKo ? "운영시간" : "Hours", media.operatingHours || (isKo ? "24시간" : "24h")],
  ];
  const monthlyImpr = media.impressions ?? null;
  const dailyFootfall = monthlyImpr ? Math.round(monthlyImpr / 30) : null;
  const priceWon = catalogPriceFieldToWon(media.price);
  const rightRows: Array<[string, string, string]> = [
    [
      "users",
      isKo ? "일일 유동인구(추정)" : "Daily footfall (est.)",
      dailyFootfall ? `${dailyFootfall.toLocaleString(locale)}${isKo ? "명" : ""}` : "—",
    ],
    ["bulb", isKo ? "송출/노출" : "Display", media.resolution ? `${media.resolution}` : (isKo ? "상시 송출" : "Always-on")],
    ["calendar", isKo ? "최소 집행" : "Min. period", isKo ? "1개월~" : "1 month+"],
    ["won", isKo ? "월 단가" : "Monthly", `₩${priceWon.toLocaleString(locale)}`],
  ];
  const cardH = 4 * 11 + 8;
  y = addPageIfNeeded(doc, fam, hasKr, y, cardH + 4);
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MX, y, CW, cardH, 2.5, 2.5, "FD");
  doc.setDrawColor(...LINE);
  doc.line(MX + colW + 3, y + 4, MX + colW + 3, y + cardH - 4);
  let ry = y + 9;
  for (let i = 0; i < 4; i++) {
    specRow(doc, fam, hasKr, leftRows[i]![0], leftRows[i]![1], leftRows[i]![2], MX + 5, ry, colW - 8);
    specRow(doc, fam, hasKr, rightRows[i]![0], rightRows[i]![1], rightRows[i]![2], MX + colW + 9, ry, colW - 8);
    ry += 11;
  }
  y += cardH + 8;

  // ── 상권 분석 ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "주변 상권" : "Trade Area", y);
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...LINE);
  const taLines = doc.splitTextToSize(
    isKo
      ? `${region} 일대는 ${categoryLabel} 매체가 운영되는 상권으로, 유동인구가 꾸준히 형성되는 지역입니다. 본 매체는 ${locationLine}에 위치해 주변 상업·교통 동선의 노출 효과를 기대할 수 있습니다.`
      : `The ${region} area sees steady footfall around ${locationLine}, offering exposure along nearby commercial and transit routes.`,
    CW - 12,
  ) as string[];
  const taH = 12 + taLines.length * 4.6 + 8;
  y = addPageIfNeeded(doc, fam, hasKr, y, taH + 4);
  doc.roundedRect(MX, y, CW, taH, 2.5, 2.5, "FD");
  // region chips
  let chipX = MX + 5;
  const chips = regionChips.slice(0, 4);
  for (const ch of chips.length ? chips : [region].filter(Boolean)) {
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(7);
    const cw = doc.getTextWidth(ch) + 6;
    doc.setFillColor(237, 233, 254);
    doc.roundedRect(chipX, y + 4, cw, 5.5, 1.4, 1.4, "F");
    doc.setTextColor(...VIOLET_DK);
    doc.text(ch, chipX + cw / 2, y + 7.8, { align: "center" });
    chipX += cw + 3;
  }
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  let ty = y + 16;
  for (const ln of taLines) {
    doc.text(ln, MX + 5, ty);
    ty += 4.6;
  }
  y += taH + 8;

  // ── 위치 지도 ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "위치 안내" : "Location Map", y);
  const mapB64 = await fetchKakaoStaticMapBase64({
    lat: media.lat,
    lng: media.lng,
    width: 600,
    height: 300,
  });
  const mapH = 48;
  y = addPageIfNeeded(doc, fam, hasKr, y, mapH + 6);
  if (mapB64) {
    try {
      doc.addImage(`data:image/png;base64,${mapB64}`, "PNG", MX, y, CW, mapH);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(MX, y, CW, mapH, 2, 2, "S");
      y += mapH + 4;
    } catch {
      y += 2;
    }
  } else {
    doc.setFillColor(...PANEL);
    doc.roundedRect(MX, y, CW, 14, 2, 2, "F");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`, MX + 5, y + 9);
    y += 18;
  }
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text(locationLine, MX, y + 1);
  y += 8;

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
  const chartW = CW;
  y = addPageIfNeeded(doc, fam, hasKr, y, chartH + 22);
  const maxV = Math.max(...pattern.hourly, 0.0001);
  const barW = chartW / 24;
  const peakIdx = pattern.hourly.indexOf(maxV);
  const baseY = y + chartH;
  for (let h = 0; h < 24; h++) {
    const bh = (pattern.hourly[h]! / maxV) * (chartH - 2);
    if (h === peakIdx) doc.setFillColor(...VIOLET);
    else doc.setFillColor(199, 210, 254);
    doc.rect(MX + h * barW + 0.6, baseY - bh, barW - 1.2, bh, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MX, baseY, MX + chartW, baseY);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...FAINT);
  for (const hh of [0, 6, 12, 18, 23]) {
    doc.text(String(hh), MX + hh * barW + barW / 2, baseY + 3.5, { align: "center" });
  }
  y = baseY + 7;

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
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(sx, y, sCardW, 15, 2, 2, "FD");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(...MUTED);
    doc.text((doc.splitTextToSize(stats[i]![0], sCardW - 4) as string[]).slice(0, 1), sx + 2.5, y + 4.5);
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(...VIOLET_DK);
    doc.text((doc.splitTextToSize(stats[i]![1], sCardW - 4) as string[]).slice(0, 2), sx + 2.5, y + 9.5);
  }
  y += 15 + 8;

  // ── 추가 사진 갤러리 ──
  const gallery = (media.sampleImages ?? []).slice(1, 4);
  if (gallery.length) {
    y = sectionTitle(doc, fam, hasKr, isKo ? "현장 사진" : "Gallery", y);
    const gW = (CW - (gallery.length - 1) * 4) / gallery.length;
    const gH = 32;
    y = addPageIfNeeded(doc, fam, hasKr, y, gH + 4);
    for (let i = 0; i < gallery.length; i++) {
      const data = await fetchImageDataUrl(gallery[i]!);
      const gx = MX + i * (gW + 4);
      if (data) {
        try {
          doc.addImage(data, guessImageFormat(data), gx, y, gW, gH);
        } catch {
          doc.setFillColor(...PANEL);
          doc.rect(gx, y, gW, gH, "F");
        }
      } else {
        doc.setFillColor(...PANEL);
        doc.rect(gx, y, gW, gH, "F");
      }
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(gx, y, gW, gH, 2, 2, "S");
    }
    y += gH + 8;
  }

  // ── 단가 정보 ──
  y = sectionTitle(doc, fam, hasKr, isKo ? "단가 정보" : "Pricing", y);
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
  y = addPageIfNeeded(doc, fam, hasKr, y, 26);
  for (let i = 0; i < 3; i++) {
    const px = MX + i * (pCardW + 4);
    const accent = i === 0;
    if (accent) doc.setFillColor(...VIOLET);
    else doc.setFillColor(...PANEL);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(px, y, pCardW, 20, 2.5, 2.5, accent ? "F" : "FD");
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...(accent ? ([222, 215, 250] as [number, number, number]) : MUTED));
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
  doc.setFillColor(...VIOLET);
  doc.rect(0, fy, PAGE_W, 24, "F");
  doc.setFillColor(...CYAN);
  doc.rect(0, fy, PAGE_W, 0.8, "F");
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(isKo ? "THINKAD 문의" : "Contact THINKAD", MX, fy + 9);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.setTextColor(230, 224, 252);
  doc.text(`Tel. ${CONTACT.tel}    ${CONTACT.email}`, MX, fy + 15.5);
  doc.text(CONTACT.site, PAGE_W - MX, fy + 15.5, { align: "right" });
  doc.setFontSize(6.8);
  doc.setTextColor(214, 205, 248);
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
