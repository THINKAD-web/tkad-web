import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { jsPDF } from "jspdf";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import {
  formatCatalogPriceFieldWon,
  mediaDetailPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { fetchKakaoStaticMapBase64 } from "@/lib/kakao-static-map";
import {
  krFontFamily,
  ensureKrFontForServerPdf,
} from "@/lib/jspdf-register-noto-kr";
import { resolvePublicMediaImageUrl } from "@/lib/optimized-image-url";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 18;
const CW = PAGE_W - MX * 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Bump when PDF layout/font logic changes (invalidates stale cache). */
const CACHE_VERSION = "v2";

const NAVY: [number, number, number] = [26, 42, 108];
const NAVY_DARK: [number, number, number] = [18, 26, 58];
const GOLD: [number, number, number] = [232, 213, 181];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [100, 108, 120];
const LINE: [number, number, number] = [228, 232, 240];
const PANEL: [number, number, number] = [248, 250, 252];

const CONTACT = {
  tel: "02-515-2772",
  email: "sales@tkad.co.kr",
  site: "app.tkad.co.kr",
};

export type GenerateMediaProposalOptions = {
  media: MediaItem;
  isKo?: boolean;
  /** PRO: 단가·CPM·노출 등 상세 포함 */
  includeProDetails?: boolean;
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

function addPageIfNeeded(doc: jsPDF, y: number, need = 18): number {
  if (y > PAGE_H - need) {
    doc.addPage();
    drawPageChrome(doc);
    return 32;
  }
  return y;
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 5.5,
): number {
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    y = addPageIfNeeded(doc, y);
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

function drawPageChrome(doc: jsPDF) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MX, 14, PAGE_W - MX, 14);
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  doc.text("THINKAD Media Proposal", MX, 11);
  doc.text("app.tkad.co.kr", PAGE_W - MX, 11, { align: "right" });
}

function drawSectionTitle(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  label: string,
  y: number,
): number {
  doc.setFillColor(...NAVY);
  doc.rect(MX, y - 4.5, 2.5, 6, "F");
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(label, MX + 5, y);
  return y + 8;
}

function drawInfoCard(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  rows: { label: string; value: string }[],
  y: number,
): number {
  const rowH = 7;
  const pad = 5;
  const h = pad * 2 + rows.length * rowH;
  y = addPageIfNeeded(doc, y, h + 4);
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(MX, y, CW, h, 2, 2, "FD");

  let cy = y + pad + 4;
  for (const row of rows) {
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(row.label, MX + pad, cy);
    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const valLines = doc.splitTextToSize(row.value, CW - pad * 2 - 28) as string[];
    doc.text(valLines[0] ?? row.value, MX + pad + 28, cy);
    if (valLines.length > 1) {
      cy += 4.5;
      setFont(doc, fam, hasKr, "normal");
      doc.setFontSize(9);
      for (let i = 1; i < valLines.length; i++) {
        doc.text(valLines[i], MX + pad + 28, cy);
        cy += 4.5;
      }
    }
    cy += rowH;
  }
  return y + h + 6;
}

function drawProUpsellBox(
  doc: jsPDF,
  fam: string,
  hasKr: boolean,
  isKo: boolean,
  y: number,
): number {
  const msg = isKo
    ? "상세 단가·CPM·노출 추정치는 THINKAD PRO 구독 후 제안서에서 확인하실 수 있습니다."
    : "Detailed pricing, CPM, and impressions are available in the PRO media proposal.";
  const lines = doc.splitTextToSize(msg, CW - 16) as string[];
  const h = 14 + lines.length * 5;
  y = addPageIfNeeded(doc, y, h + 4);
  doc.setFillColor(255, 251, 240);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(MX, y, CW, h, 2, 2, "FD");
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(isKo ? "PRO 상세 정보" : "PRO details", MX + 6, y + 7);
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let ly = y + 12;
  for (const line of lines) {
    doc.text(line, MX + 6, ly);
    ly += 5;
  }
  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.text(
    `${isKo ? "문의" : "Contact"}: ${CONTACT.email} · ${CONTACT.tel}`,
    MX + 6,
    y + h - 4,
  );
  return y + h + 8;
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

  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKr = await ensureKrFontForServerPdf(doc);
  const fam = krFontFamily(hasKr);

  const issued = new Date();
  const issuedStr = issued.toLocaleDateString(isKo ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const typeLabel =
    typeLabels[media.type as keyof typeof typeLabels]?.ko ?? media.type;
  const mediaTitle = isKo ? media.name : media.nameEn || media.name;
  const locationLine = isKo
    ? media.location
    : media.locationEn || media.location;

  const logo = loadThinkadLogoDataUrl();

  // ── Cover header ──
  doc.setFillColor(...NAVY_DARK);
  doc.rect(0, 0, PAGE_W, 44, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 44, PAGE_W, 1.2, "F");

  if (logo) {
    try {
      doc.addImage(logo, "PNG", MX, 10, 28, 17);
    } catch {
      /* skip */
    }
  }

  doc.setTextColor(...GOLD);
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(logo ? 11 : 14);
  doc.text("THINKAD", logo ? MX + 32 : MX, logo ? 18 : 16);

  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.setTextColor(210, 215, 230);
  doc.text(
    isKo ? "싱커드 · 옥외광고 플랫폼" : "THINKAD OOH Platform",
    logo ? MX + 32 : MX,
    logo ? 24 : 22,
  );

  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(isKo ? "매체 제안서" : "Media Proposal", MX, 38);

  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(
    `${isKo ? "발행일" : "Issued"}: ${issuedStr}`,
    PAGE_W - MX,
    38,
    { align: "right" },
  );

  let y = 54;

  // ── Title block ──
  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  y = writeWrapped(doc, mediaTitle, MX, y, CW, 7.5);
  y += 2;

  const infoRows: { label: string; value: string }[] = [
    { label: isKo ? "위치" : "Location", value: locationLine },
    { label: isKo ? "유형" : "Type", value: typeLabel },
  ];
  if (media.size) {
    infoRows.push({ label: isKo ? "규격" : "Size", value: media.size });
  }
  if (media.operatingHours) {
    infoRows.push({
      label: isKo ? "운영시간" : "Hours",
      value: media.operatingHours,
    });
  }
  if (media.resolution) {
    infoRows.push({
      label: isKo ? "해상도" : "Resolution",
      value: media.resolution,
    });
  }
  y = drawInfoCard(doc, fam, hasKr, infoRows, y);

  // ── Hero image ──
  const thumb =
    media.sampleImages[0] != null
      ? await fetchImageDataUrl(media.sampleImages[0])
      : null;
  if (thumb) {
    y = addPageIfNeeded(doc, y, 62);
    const imgH = 54;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(MX, y, CW, imgH, 2, 2, "S");
    try {
      const fmt = guessImageFormat(thumb);
      doc.addImage(thumb, fmt, MX + 0.5, y + 0.5, CW - 1, imgH - 1);
      y += imgH + 8;
    } catch {
      y += 4;
    }
  }

  // ── Pricing ──
  y = drawSectionTitle(
    doc,
    fam,
    hasKr,
    isKo ? "단가 정보" : "Pricing",
    y,
  );

  if (includeProDetails) {
    const locale = isKo ? "ko-KR" : "en-US";
    const periodKey = mediaDetailPricePeriodTranslationKey(media.pricePeriod);
    const periodLabel = isKo
      ? ({ month: "월", biweekly: "2주", week: "주", day: "일" } as const)[
          periodKey as "month" | "biweekly" | "week" | "day"
        ] ?? "월"
      : periodKey;

    setFont(doc, fam, hasKr, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    y = writeWrapped(
      doc,
      `${formatCatalogPriceFieldWon(media.price, locale)} / ${periodLabel}`,
      MX,
      y,
      CW,
      7,
    );
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    y = writeWrapped(
      doc,
      isKo
        ? "※ 표시 금액은 VAT 별도입니다."
        : "※ Prices exclude VAT unless noted.",
      MX,
      y,
      CW,
      4.5,
    );

    if (media.priceOptions?.length) {
      y += 2;
      for (const opt of media.priceOptions.slice(0, 6)) {
        y = writeWrapped(
          doc,
          `· ${opt.label}: ${formatCatalogPriceFieldWon(opt.price, locale)}`,
          MX + 2,
          y,
          CW - 2,
        );
      }
    }

    const metrics: string[] = [];
    if (media.impressions != null) {
      metrics.push(
        `${isKo ? "예상 노출" : "Impressions"}: ${media.impressions.toLocaleString(locale)}`,
      );
    }
    if (media.cpm != null) {
      metrics.push(
        `${isKo ? "CPM" : "CPM"}: ₩${Math.round(media.cpm).toLocaleString(locale)}`,
      );
    }
    if (media.reach != null) {
      metrics.push(
        `${isKo ? "도달" : "Reach"}: ${Math.round(media.reach).toLocaleString(locale)}`,
      );
    }
    if (metrics.length) {
      y += 4;
      y = drawSectionTitle(
        doc,
        fam,
        hasKr,
        isKo ? "성과 지표 (참고)" : "Performance (reference)",
        y,
      );
      setFont(doc, fam, hasKr, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      for (const m of metrics) {
        y = writeWrapped(doc, m, MX, y, CW);
      }
    }
  } else {
    y = drawProUpsellBox(doc, fam, hasKr, isKo, y);
  }

  // ── Map ──
  y += 2;
  y = drawSectionTitle(
    doc,
    fam,
    hasKr,
    isKo ? "위치 안내" : "Location",
    y,
  );

  const mapB64 = await fetchKakaoStaticMapBase64({
    lat: media.lat,
    lng: media.lng,
    width: 560,
    height: 320,
  });
  if (mapB64) {
    y = addPageIfNeeded(doc, y, 58);
    try {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(MX, y, CW, 50, 2, 2, "S");
      doc.addImage(
        `data:image/png;base64,${mapB64}`,
        "PNG",
        MX + 0.5,
        y + 0.5,
        CW - 1,
        49,
      );
      y += 54;
    } catch {
      setFont(doc, fam, hasKr, "normal");
      doc.setFontSize(9);
      y = writeWrapped(
        doc,
        `${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`,
        MX,
        y,
        CW,
      );
    }
  } else {
    setFont(doc, fam, hasKr, "normal");
    doc.setFontSize(9);
    y = writeWrapped(
      doc,
      `${media.lat.toFixed(5)}, ${media.lng.toFixed(5)}`,
      MX,
      y,
      CW,
    );
  }

  // ── Footer contact band ──
  y = addPageIfNeeded(doc, y, 36);
  doc.setFillColor(...NAVY);
  doc.rect(0, PAGE_H - 28, PAGE_W, 28, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, PAGE_H - 28, PAGE_W, 0.8, "F");

  setFont(doc, fam, hasKr, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(isKo ? "THINKAD 문의" : "Contact THINKAD", MX, PAGE_H - 18);

  setFont(doc, fam, hasKr, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text(`Tel. ${CONTACT.tel}`, MX, PAGE_H - 11);
  doc.text(CONTACT.email, MX + 52, PAGE_H - 11);
  doc.text(CONTACT.site, PAGE_W - MX, PAGE_H - 11, { align: "right" });

  const buf = Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
  await writeCache(cacheFile, buf);
  return buf;
}
