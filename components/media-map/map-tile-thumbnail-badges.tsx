"use client";

import { ShieldCheck, Truck, Zap, Network } from "lucide-react";
import { visibilityPinTierDefForScore } from "@/lib/map-pin-visibility-colors";
import { resolveItemMapDisplayMode } from "@/lib/media-map/map-display-mode";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_BADGES = 2;

const chipBase =
  "inline-flex max-w-full items-center gap-0.5 truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide backdrop-blur-sm sm:text-[10px]";

type ThumbnailBadge = {
  key: string;
  label: string;
  title?: string;
  className: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  /** tooltip 수신 — pointer-events-auto */
  interactive?: boolean;
};

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
        chipBase,
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
        chipBase,
        "pointer-events-auto bg-slate-800/85 text-white shadow-sm dark:bg-slate-700/90",
      ),
      interactive: true,
    });
  }

  if (item.isVerified) {
    badges.push({
      key: "verified",
      label: isKo ? "검증" : "Verified",
      title: isKo
        ? "싱커드 4단계 검증: 현장 방문 → 촬영 실측 → 데이터 검증 → 등록"
        : "THINKAD 4-step verified inventory",
      className: cn(
        chipBase,
        "pointer-events-auto bg-[color:var(--qp-accent)] uppercase text-white shadow-none",
      ),
      icon: <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />,
      interactive: true,
    });
  }

  if (item.isInstantBooking) {
    badges.push({
      key: "instant",
      label: isKo ? "즉시예약(안내)" : "Instant (info)",
      title: isKo
        ? "운영자가 즉시 예약 경로를 켠 매체입니다. 날짜별 재고와는 다를 수 있습니다."
        : "Instant-book path enabled by ops — not live date inventory.",
      className: cn(
        chipBase,
        "pointer-events-auto border border-emerald-400/40 bg-emerald-500/90 text-white shadow-[0_4px_14px_rgba(16,185,129,0.28)]",
      ),
      icon: <Zap className="h-3 w-3 shrink-0" aria-hidden />,
      interactive: true,
    });
  }

  if (item.visibilityScore > 0) {
    const tier = visibilityPinTierDefForScore(item.visibilityScore);
    badges.push({
      key: "visibility",
      label: String(item.visibilityScore),
      title: isKo
        ? `가시성 점수 ${item.visibilityScore}`
        : `Visibility score ${item.visibilityScore}`,
      className: cn(chipBase, "tabular-nums shadow-sm"),
      style: {
        backgroundColor: tier.fill,
        color: tier.text,
        border: `1px solid ${tier.stroke}`,
      },
    });
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
  if (badges.length === 0) return null;

  const visible = badges.slice(0, MAX_VISIBLE_BADGES);
  const overflow = badges.length - visible.length;
  const overflowBadges = badges.slice(MAX_VISIBLE_BADGES);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-1.5 top-1.5 z-10 flex flex-wrap items-start gap-1 sm:inset-x-2 sm:top-2",
        className,
      )}
      data-map-tile-badge-stack
    >
      {visible.map((badge) => (
        <span
          key={badge.key}
          className={badge.className}
          title={badge.title}
          style={badge.style}
        >
          {badge.icon}
          {badge.label}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            chipBase,
            "pointer-events-auto bg-black/65 text-white shadow-sm backdrop-blur-sm",
          )}
          title={overflowBadges
            .map((b) => b.title ?? b.label)
            .join(" · ")}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
