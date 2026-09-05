import type { MediaItem, MediaSellingUnit } from "@/lib/media-data";
import {
  effectiveHeightM,
  effectiveWidthM,
} from "@/lib/media-filter-advanced";

const SELLING_UNIT_LABEL_KO: Record<MediaSellingUnit, string> = {
  panel: "1면",
  vehicle: "1대",
  station: "1개 역",
  route: "1개 노선",
  site: "1개 지점",
  network_package: "네트워크 패키지",
  screen: "1개 화면",
};

const SELLING_UNIT_LABEL_EN: Record<MediaSellingUnit, string> = {
  panel: "per panel",
  vehicle: "per vehicle",
  station: "per station",
  route: "per route",
  site: "per site",
  network_package: "network package",
  screen: "per screen",
};

type CreativeSpecSource = Pick<
  MediaItem,
  "resolutionW" | "resolutionH" | "aspectRatio" | "sellingUnit" | "fileFormats"
>;

/**
 * PR-3 Phase 2 필드 — 백필 안 된 매체는 전부 undefined일 수 있음(정상).
 * 값이 하나라도 있으면 "1920×1080px (16:9) · 판매단위: 1면 · 파일형식: MP4, JPG" 형식으로 조립.
 */
export function formatCreativeSpecLine(
  m: CreativeSpecSource,
  isKo: boolean,
): string | undefined {
  const parts: string[] = [];
  if (m.resolutionW && m.resolutionH) {
    const ratio = m.aspectRatio?.trim();
    parts.push(
      ratio ? `${m.resolutionW}×${m.resolutionH}px (${ratio})` : `${m.resolutionW}×${m.resolutionH}px`,
    );
  }
  if (m.sellingUnit) {
    const label = isKo
      ? SELLING_UNIT_LABEL_KO[m.sellingUnit]
      : SELLING_UNIT_LABEL_EN[m.sellingUnit];
    if (label) parts.push(isKo ? `판매단위: ${label}` : `Unit: ${label}`);
  }
  if (m.fileFormats?.length) {
    parts.push(
      isKo
        ? `파일형식: ${m.fileFormats.join(", ")}`
        : `Formats: ${m.fileFormats.join(", ")}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

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
