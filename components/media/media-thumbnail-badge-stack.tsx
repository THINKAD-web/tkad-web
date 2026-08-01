"use client";

import { ShieldCheck, Zap } from "lucide-react";
import { visibilityPinTierDefForScore } from "@/lib/map-pin-visibility-colors";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { cn } from "@/lib/utils";

export const THUMBNAIL_BADGE_CHIP_BASE =
  "inline-flex max-w-full items-center gap-0.5 truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide backdrop-blur-sm sm:text-[10px]";

export type ThumbnailBadge = {
  key: string;
  label: string;
  title?: string;
  className: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  /** tooltip 수신 — pointer-events-auto */
  interactive?: boolean;
};

const DEFAULT_MAX_VISIBLE = 2;

export function buildVerifiedThumbnailBadge(isKo: boolean): ThumbnailBadge {
  return {
    key: "verified",
    label: isKo ? "검증" : "Verified",
    title: isKo
      ? "싱커드 4단계 검증: 현장 방문 → 촬영 실측 → 데이터 검증 → 등록"
      : "THINKAD 4-step verified inventory",
    className: cn(
      THUMBNAIL_BADGE_CHIP_BASE,
      "pointer-events-auto bg-[color:var(--qp-accent)] uppercase text-white shadow-none",
    ),
    icon: <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />,
    interactive: true,
  };
}

export function buildInstantThumbnailBadge(isKo: boolean): ThumbnailBadge {
  return {
    key: "instant",
    label: isKo ? "즉시예약(안내)" : "Instant (info)",
    title: isKo
      ? "운영자가 즉시 예약 경로를 켠 매체입니다. 날짜별 재고와는 다를 수 있습니다."
      : "Instant-book path enabled by ops — not live date inventory.",
    className: cn(
      THUMBNAIL_BADGE_CHIP_BASE,
      "pointer-events-auto border border-emerald-400/40 bg-emerald-500/90 text-white shadow-[0_4px_14px_rgba(16,185,129,0.28)]",
    ),
    icon: <Zap className="h-3 w-3 shrink-0" aria-hidden />,
    interactive: true,
  };
}

export function buildVisibilityThumbnailBadge(
  visibilityScore: number,
  isKo: boolean,
): ThumbnailBadge {
  const tier = visibilityPinTierDefForScore(visibilityScore);
  return {
    key: "visibility",
    label: String(visibilityScore),
    title: isKo
      ? `가시성 점수 ${visibilityScore}`
      : `Visibility score ${visibilityScore}`,
    className: cn(THUMBNAIL_BADGE_CHIP_BASE, "tabular-nums shadow-sm"),
    style: {
      backgroundColor: tier.fill,
      color: tier.text,
      border: `1px solid ${tier.stroke}`,
    },
  };
}

export function buildRankThumbnailBadge(rank: number): ThumbnailBadge {
  return {
    key: "rank",
    label: String(rank),
    className:
      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hermes text-xs font-black text-white shadow-md",
  };
}

type TrustItem = Pick<
  HomeCatalogMediaItem,
  "isVerified" | "isInstantBooking"
>;

/** 검증 → 즉시예약 우선순위 */
export function buildTrustThumbnailBadges(
  item: TrustItem,
  isKo: boolean,
  options?: { verifiedOnly?: boolean },
): ThumbnailBadge[] {
  const badges: ThumbnailBadge[] = [];
  if (item.isVerified) {
    badges.push(buildVerifiedThumbnailBadge(isKo));
  }
  if (!options?.verifiedOnly && item.isInstantBooking) {
    badges.push(buildInstantThumbnailBadge(isKo));
  }
  return badges;
}

type CatalogBadgeItem = Pick<
  HomeCatalogMediaItem,
  "isVerified" | "isInstantBooking" | "visibilityScore"
>;

/** 카탈로그 카드 — 검증 → 즉시예약 → 가시성(순위 없을 때) */
export function buildCatalogThumbnailBadges(
  item: CatalogBadgeItem,
  isKo: boolean,
  options?: {
    rank?: number;
    hideVisibility?: boolean;
    verifiedOnly?: boolean;
  },
): ThumbnailBadge[] {
  const badges: ThumbnailBadge[] = [];

  if (options?.rank != null) {
    badges.push(buildRankThumbnailBadge(options.rank));
  }

  badges.push(...buildTrustThumbnailBadges(item, isKo, options));

  const visScore = item.visibilityScore ?? 0;
  if (
    !options?.hideVisibility &&
    options?.rank == null &&
    visScore > 0
  ) {
    badges.push(buildVisibilityThumbnailBadge(visScore, isKo));
  }

  return badges;
}

type StackProps = {
  badges: ThumbnailBadge[];
  className?: string;
  maxVisible?: number;
};

export function MediaThumbnailBadgeStack({
  badges,
  className,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: StackProps) {
  if (badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - visible.length;
  const overflowBadges = badges.slice(maxVisible);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-1.5 top-1.5 z-10 flex flex-wrap items-start gap-1 sm:inset-x-2 sm:top-2",
        className,
      )}
      data-media-thumbnail-badge-stack
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
            THUMBNAIL_BADGE_CHIP_BASE,
            "pointer-events-auto bg-black/65 text-white shadow-sm backdrop-blur-sm",
          )}
          title={overflowBadges.map((b) => b.title ?? b.label).join(" · ")}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
