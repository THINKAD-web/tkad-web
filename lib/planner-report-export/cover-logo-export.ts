import {
  dataUrlImageFormat,
  loadExportImageForPdf,
} from "@/lib/export-media-images";

const COVER_LOGO_PDF_OPTS = {
  width: 256,
  height: 256,
  quality: 88,
} as const;

/** Fetch + normalize cover logo for PDF/PPTX embed (planner + builder SSOT). */
export async function loadCoverLogoExportData(
  coverLogoUrl?: string | null,
): Promise<string | null> {
  const url = coverLogoUrl?.trim();
  if (!url) return null;
  return loadExportImageForPdf(url, COVER_LOGO_PDF_OPTS);
}

/** Planner/builder PDF cover — top-right logo slot (matches DocumentGradientHero). */
export function drawPdfCoverLogo(
  doc: {
    addImage: (
      imageData: string,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void;
  },
  coverLogoData: string | null,
  pageW: number,
  marginMm: number,
): void {
  if (!coverLogoData) return;
  const logoSize = 28;
  try {
    doc.addImage(
      coverLogoData,
      dataUrlImageFormat(coverLogoData),
      pageW - marginMm - logoSize,
      22,
      logoSize,
      logoSize,
    );
  } catch {
    /* broken logo */
  }
}

type PptxCoverSlide = {
  addImage: (opts: {
    data: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }) => void;
};

/** Planner/builder PPTX cover — top-right logo slot. */
export function addPptxCoverLogo(
  slide: PptxCoverSlide,
  coverLogoData: string | null,
  slideWidthIn = 13.33,
): void {
  if (!coverLogoData) return;
  try {
    slide.addImage({
      data: coverLogoData,
      x: slideWidthIn - 2.2,
      y: 0.45,
      w: 1.5,
      h: 1.5,
    });
  } catch {
    /* broken logo */
  }
}
