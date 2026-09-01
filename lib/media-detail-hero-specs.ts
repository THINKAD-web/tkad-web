import type { MediaItem } from "@/lib/media-data";
import { formatSizeDisplayOptional } from "@/lib/format-media-size";

export type MediaHeroSpecBadge = {
  key: string;
  label: string;
  value: string;
};

type BuildOpts = {
  isKo: boolean;
  visibilityScore: number;
  labels: {
    size: string;
    resolution: string;
    visibility: string;
    brightness?: string;
  };
};

/** 집행 탭 스펙표 핵심 2~3개 — 히어로 요약 배지용 */
export function buildMediaHeroSpecBadges(
  media: MediaItem,
  { isKo, visibilityScore, labels }: BuildOpts,
): MediaHeroSpecBadge[] {
  const badges: MediaHeroSpecBadge[] = [];

  const size = formatSizeDisplayOptional(media);
  if (size) {
    badges.push({ key: "size", label: labels.size, value: size });
  }

  const resolution = media.resolution?.trim();
  if (resolution && (media.type === "dooh" || media.type === "static")) {
    badges.push({
      key: "resolution",
      label: labels.resolution,
      value: resolution,
    });
  }

  if (visibilityScore > 0) {
    badges.push({
      key: "visibility",
      label: labels.visibility,
      value: String(visibilityScore),
    });
  }

  if (badges.length >= 3) {
    return badges.slice(0, 3);
  }

  const brightness = media.brightness?.trim();
  if (brightness && badges.length < 3) {
    badges.push({
      key: "brightness",
      label: labels.brightness ?? (isKo ? "휘도" : "Brightness"),
      value: brightness,
    });
  }

  const targetAge = (isKo ? media.targetAge : media.targetAge)?.trim();
  if (targetAge && badges.length < 3) {
    badges.push({
      key: "targetAge",
      label: isKo ? "타깃" : "Target",
      value: targetAge.length > 24 ? `${targetAge.slice(0, 22)}…` : targetAge,
    });
  }

  return badges.slice(0, 3);
}
