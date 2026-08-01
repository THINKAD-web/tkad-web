"use client";

import { Truck, Network } from "lucide-react";
import { resolveItemMapDisplayMode } from "@/lib/media-map/map-display-mode";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import {
  buildInstantThumbnailBadge,
  buildVerifiedThumbnailBadge,
  buildVisibilityThumbnailBadge,
  MediaThumbnailBadgeStack,
  THUMBNAIL_BADGE_CHIP_BASE,
  type ThumbnailBadge,
} from "@/components/media/media-thumbnail-badge-stack";
import { cn } from "@/lib/utils";

function serviceRegionTooltip(
  item: MapMapItem,
  regionLabel: string | undefined,
  isKo: boolean,
): string {
  const region = regionLabel?.trim();
  if (item.type === "mobile") {
    return isKo
      ? region
        ? `서비스 지역: ${region} (이동형 매체)`
        : "서비스 지역 미등록 (이동형 매체)"
      : region
        ? `Service area: ${region} (mobile media)`
        : "Service area not set (mobile media)";
  }
  if (item.type === "network" || item.type?.toLowerCase().includes("network")) {
    return isKo
      ? region
        ? `서비스 지역: ${region} (네트워크 · 지도 핀 없음)`
        : "서비스 지역 미등록 (네트워크)"
      : region
        ? `Service area: ${region} (network · no map pin)`
        : "Service area not set (network)";
  }
  return isKo
    ? region
      ? `서비스 지역: ${region}`
      : "서비스 지역 미등록"
    : region
      ? `Service area: ${region}`
      : "Service area not set";
}

function buildMapTileThumbnailBadges(
  item: MapMapItem,
  isKo: boolean,
): ThumbnailBadge[] {
  const badges: ThumbnailBadge[] = [];
  const mode = resolveItemMapDisplayMode(item);

  if (mode === "service_region") {
    const regionLabel = item.serviceRegionLabel?.trim();
    const isMobile = item.type === "mobile";
    badges.push({
      key: "service_region",
      label: regionLabel || (isKo ? "지역 미등록" : "No region"),
      title: serviceRegionTooltip(item, regionLabel, isKo),
      className: cn(
        THUMBNAIL_BADGE_CHIP_BASE,
        "pointer-events-auto bg-emerald-900/90 text-white shadow-sm dark:bg-emerald-800/90",
      ),
      icon: isMobile ? (
        <Truck className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <Network className="h-3 w-3 shrink-0" aria-hidden />
      ),
      interactive: true,
    });
  } else if (mode === "location_unknown") {
    badges.push({
      key: "location_unknown",
      label: isKo ? "위치 미확인" : "No location",
      title: isKo ? "좌표 미등록 매체" : "Media without map coordinates",
      className: cn(
        THUMBNAIL_BADGE_CHIP_BASE,
        "pointer-events-auto bg-slate-800/85 text-white shadow-sm dark:bg-slate-700/90",
      ),
      interactive: true,
    });
  }

  if (item.isVerified) {
    badges.push(buildVerifiedThumbnailBadge(isKo));
  }

  if (item.isInstantBooking) {
    badges.push(buildInstantThumbnailBadge(isKo));
  }

  if (item.visibilityScore > 0) {
    badges.push(buildVisibilityThumbnailBadge(item.visibilityScore, isKo));
  }

  return badges;
}

type Props = {
  item: MapMapItem;
  isKo?: boolean;
  hideVisibilityScore?: boolean;
  className?: string;
};

export function MapTileThumbnailBadges({
  item,
  isKo = true,
  hideVisibilityScore = false,
  className,
}: Props) {
  let badges = buildMapTileThumbnailBadges(item, isKo);
  if (hideVisibilityScore) {
    badges = badges.filter((b) => b.key !== "visibility");
  }

  return (
    <MediaThumbnailBadgeStack badges={badges} className={className} />
  );
}
