"use client";

import { ShieldCheck, Zap } from "lucide-react";
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
};

function buildMapTileThumbnailBadges(
  item: MapMapItem,
  isKo: boolean,
): ThumbnailBadge[] {
  const badges: ThumbnailBadge[] = [];
  const mode = resolveItemMapDisplayMode(item);

  if (mode === "service_region") {
    const label = item.serviceRegionLabel?.trim();
    badges.push({
      key: "service_region",
      label: isKo
        ? label
          ? `서비스 ${label}`
          : "서비스 지역"
        : label
          ? `Service ${label}`
          : "Service region",
      title: isKo
        ? label
          ? `서비스 지역: ${label}`
          : "서비스 지역 미등록"
        : label
          ? `Service region: ${label}`
          : "Region unassigned",
      className: cn(
        chipBase,
        "bg-emerald-900/90 text-white shadow-sm dark:bg-emerald-800/90",
      ),
    });
  } else if (mode === "location_unknown") {
    badges.push({
      key: "location_unknown",
      label: isKo ? "위치 미확인" : "No location",
      title: isKo ? "좌표 미등록 매체" : "Media without map coordinates",
      className: cn(
        chipBase,
        "bg-slate-800/85 text-white shadow-sm dark:bg-slate-700/90",
      ),
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
        "bg-[color:var(--qp-accent)] uppercase text-white shadow-none",
      ),
      icon: <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />,
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
        "border border-emerald-400/40 bg-emerald-500/90 text-white shadow-[0_4px_14px_rgba(16,185,129,0.28)]",
      ),
      icon: <Zap className="h-3 w-3 shrink-0" aria-hidden />,
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
  /** C-round: 지도 리스트에서는 가시성 숫자 배지 생략 */
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

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-1.5 top-1.5 z-10 flex flex-wrap items-start gap-1 sm:inset-x-2 sm:top-2",
        className,
      )}
      data-map-tile-badge-stack
      aria-hidden
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
            "bg-black/65 text-white shadow-sm backdrop-blur-sm",
          )}
          title={badges
            .slice(MAX_VISIBLE_BADGES)
            .map((b) => b.label)
            .join(" · ")}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
