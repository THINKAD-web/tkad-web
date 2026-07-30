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

/** PDF/PPTX 매체 카드 썸네일 박스 (4:3, mm) — 견적·일반 export */
export const EXPORT_THUMB_BOX_MM = { w: 20, h: 15 } as const;

/** 플래너 보고서 매체 카드 썸네일 (4:3, mm) — 화면 largeThumb w-48/sm:w-64 와 동일 비율 */
export const PLANNER_EXPORT_THUMB_BOX_MM = { w: 32, h: 24 } as const;

/** 서버 임베드용 4:3 cover 크롭 (픽셀) — jsPDF·Keynote 등에서 비율 깨짐 방지 */
export const EXPORT_THUMB_PIXELS = { w: 400, h: 300 } as const;

/** 매체 제안서 PDF 히어로 — 16:9 */
export const PROPOSAL_HERO_PIXELS = { w: 1200, h: 675 } as const;

export const PROPOSAL_HERO_JPEG_QUALITY = 88;
export const PROPOSAL_GALLERY_JPEG_QUALITY = 84;

export async function coverCropImageDataUrl(
  dataUrl: string,
  opts: {
    width: number;
    height: number;
    quality: number;
  },
): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const base64 = dataUrl.includes(",") ? (dataUrl.split(",", 2)[1] ?? "") : dataUrl;
    const input = Buffer.from(base64, "base64");
    const out = await sharp(input)
      .rotate()
      .resize(opts.width, opts.height, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: opts.quality })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl;
  }
}

async function coverCropThumbDataUrl(dataUrl: string): Promise<string> {
  return coverCropImageDataUrl(dataUrl, {
    width: EXPORT_THUMB_PIXELS.w,
    height: EXPORT_THUMB_PIXELS.h,
    quality: PROPOSAL_GALLERY_JPEG_QUALITY,
  });
}

/** URL fetch → cover crop → JPEG data URL (PDF 임베드용) */
export async function loadExportImageForPdf(
  url: string,
  opts: {
    width: number;
    height: number;
    quality: number;
    timeoutMs?: number;
  },
): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  try {
    const raw = await Promise.race([
      fetchMediaImageDataUrl(url),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!raw) return null;
    return await coverCropImageDataUrl(raw, {
      width: opts.width,
      height: opts.height,
      quality: opts.quality,
    });
  } catch {
    return null;
  }
}

export function loadProposalHeroImage(url: string): Promise<string | null> {
  return loadExportImageForPdf(url, {
    width: PROPOSAL_HERO_PIXELS.w,
    height: PROPOSAL_HERO_PIXELS.h,
    quality: PROPOSAL_HERO_JPEG_QUALITY,
  });
}

export function loadProposalGalleryImage(url: string): Promise<string | null> {
  return loadExportImageForPdf(url, {
    width: EXPORT_THUMB_PIXELS.w,
    height: EXPORT_THUMB_PIXELS.h,
    quality: PROPOSAL_GALLERY_JPEG_QUALITY,
  });
}

/** jsPDF — 4:3 cover 크롭 썸네일 (눌림 방지) */
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
  try {
    // loadExportThumbMap / loadExportImageForPdf 에서 JPEG 로 정규화됨
    doc.addImage(dataUrl, fmt, boxX, boxY, boxW, boxH);
  } catch {
    /* skip broken image */
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
    thumbUrls.map(async (u) => {
      try {
        const raw = await Promise.race([
          fetchMediaImageDataUrl(u),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
        ]);
        if (!raw) return [u, raw] as const;
        const cropped = await coverCropThumbDataUrl(raw);
        return [u, cropped] as const;
      } catch {
        return [u, null] as const;
      }
    }),
  );
  return new Map<string, string>(
    thumbEntries.filter((e): e is readonly [string, string] => Boolean(e[1])),
  );
}
