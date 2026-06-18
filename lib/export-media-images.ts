/**
 * PDF/PPTX보내기용 매체 썸네일 — 서버에서 fetch 후 data URL 맵 생성.
 * Content-Type 헤더·확장자와 실제 바이트 불일치(JPEG인데 image/png) 시 jsPDF 깨짐 방지.
 */
import { fetchMediaImageDataUrl } from "@/lib/server-media-image";

export type ExportThumbRow = { thumbUrl?: string | null };

/** data URL → jsPDF addImage 포맷 (매직 바이트 우선) */
export function dataUrlImageFormat(d: string): "PNG" | "WEBP" | "JPEG" {
  try {
    const base64 = d.includes(",") ? (d.split(",", 2)[1] ?? "") : d;
    const head = Buffer.from(base64.slice(0, 32), "base64");
    if (head.length >= 2 && head[0] === 0xff && head[1] === 0xd8) return "JPEG";
    if (head.length >= 2 && head[0] === 0x89 && head[1] === 0x50) return "PNG";
    if (
      head.length >= 12 &&
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "WEBP";
    }
  } catch {
    /* fall through to header */
  }
  if (d.startsWith("data:image/png")) return "PNG";
  if (d.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

export type ImagePixelSize = { width: number; height: number };

/** data URL(JPEG/PNG) 픽셀 크기 — jsPDF 썸네일 비율 보존용 */
export function readDataUrlImageSize(dataUrl: string): ImagePixelSize | null {
  try {
    const base64 = dataUrl.includes(",") ? (dataUrl.split(",", 2)[1] ?? "") : dataUrl;
    const buf = Buffer.from(base64, "base64");
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width > 0 && height > 0) return { width, height };
    }
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) break;
        const marker = buf[offset + 1]!;
        const length = buf.readUInt16BE(offset + 2);
        if (length < 2) break;
        if (marker >= 0xc0 && marker <= 0xc3) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
        }
        offset += 2 + length;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** object-fit: cover — 박스를 채우되 원본 비율 유지 (넘치는 부분은 clip) */
export function fitImageCover(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  if (imgW <= 0 || imgH <= 0) {
    return { x: 0, y: 0, w: boxW, h: boxH };
  }
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** PDF/PPTX 매체 카드 썸네일 박스 (4:3, mm) */
export const EXPORT_THUMB_BOX_MM = { w: 20, h: 15 } as const;

/** jsPDF — 비율 보존 cover 썸네일 (눌림 방지) */
export function addPdfThumbImage(
  doc: import("jspdf").jsPDF,
  dataUrl: string,
  boxX: number,
  boxY: number,
  boxW: number = EXPORT_THUMB_BOX_MM.w,
  boxH: number = EXPORT_THUMB_BOX_MM.h,
): void {
  const fmt = dataUrlImageFormat(dataUrl);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "F");

  const size = readDataUrlImageSize(dataUrl);
  if (!size) {
    try {
      doc.addImage(dataUrl, fmt, boxX, boxY, boxW, boxH);
    } catch {
      /* skip broken image */
    }
    return;
  }

  const fit = fitImageCover(size.width, size.height, boxW, boxH);
  try {
    doc.saveGraphicsState();
    doc.rect(boxX, boxY, boxW, boxH);
    doc.clip();
    doc.addImage(
      dataUrl,
      fmt,
      boxX + fit.x,
      boxY + fit.y,
      fit.w,
      fit.h,
    );
    doc.restoreGraphicsState();
  } catch {
    try {
      doc.addImage(dataUrl, fmt, boxX + fit.x, boxY + fit.y, fit.w, fit.h);
    } catch {
      /* skip */
    }
  }
}

/** 포트폴리오·견적 라인 등에서 썸네일 URL 목록 → data URL 맵 */
export async function loadExportThumbMap(
  rows: readonly ExportThumbRow[],
): Promise<Map<string, string>> {
  const thumbUrls = [
    ...new Set(
      rows.map((r) => r.thumbUrl).filter((u): u is string => Boolean(u?.trim())),
    ),
  ];
  const thumbEntries = await Promise.all(
    thumbUrls.map(async (u) => [u, await fetchMediaImageDataUrl(u)] as const),
  );
  return new Map<string, string>(
    thumbEntries.filter((e): e is readonly [string, string] => Boolean(e[1])),
  );
}
