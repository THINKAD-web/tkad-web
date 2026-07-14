import type { MediaItem } from "@/lib/media-data";
import {
  effectiveHeightM,
  effectiveWidthM,
} from "@/lib/media-filter-advanced";

export function formatDimM(n: number): string {
  const s = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  return s.replace(/\.0$/, "");
}

type SizeSource = Pick<MediaItem, "size" | "widthM" | "heightM">;

export function formatSizeFromMeters(widthM: number, heightM: number): string {
  return `${formatDimM(widthM)}m × ${formatDimM(heightM)}m`;
}

/** 비교·상세·PDF 공통 크기 표기 — widthM/heightM 우선, 없으면 size 문자열 fallback */
export function formatSizeDisplay(m: SizeSource): string {
  const sized = formatSizeDisplayOptional(m);
  return sized ?? "—";
}

export function formatSizeDisplayOptional(m: SizeSource): string | undefined {
  const w = effectiveWidthM(m as MediaItem);
  const h = effectiveHeightM(m as MediaItem);
  if (w != null && h != null) {
    return formatSizeFromMeters(w, h);
  }
  const raw = m.size?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}
