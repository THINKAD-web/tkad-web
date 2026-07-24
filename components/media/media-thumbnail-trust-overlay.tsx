"use client";

import { ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";

type OverlayItem = Pick<
  HomeCatalogMediaItem,
  "isVerified" | "isInstantBooking"
>;

type Props = {
  item: OverlayItem;
  isKo: boolean;
  variant?: "card" | "feed";
  /** 피드 카드 — 검증 뱃지만 (즉시예약은 상세로) */
  verifiedOnly?: boolean;
  className?: string;
};

const chipBase =
  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide backdrop-blur-sm sm:text-[10px]";

const verifiedClass = cn(
  chipBase,
  "bg-[color:var(--qp-accent)] uppercase text-white shadow-none",
);

const instantClass = cn(
  chipBase,
  "border border-emerald-400/40 bg-emerald-500/90 text-white shadow-[0_4px_14px_rgba(16,185,129,0.28)]",
);

export function MediaThumbnailTrustOverlay({
  item,
  isKo,
  variant = "card",
  verifiedOnly = false,
  className,
}: Props) {
  const showVerified = Boolean(item.isVerified);
  const showInstant = !verifiedOnly && Boolean(item.isInstantBooking);

  if (!showVerified && !showInstant) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-10", className)}
      aria-hidden
    >
      {showInstant ? (
        <span
          className={cn(
            instantClass,
            "absolute left-1.5 top-1.5 sm:left-2 sm:top-2",
          )}
          title={
            isKo
              ? "운영자가 즉시 예약 경로를 켠 매체입니다. 날짜별 재고와는 다를 수 있습니다."
              : "Instant-book path enabled by ops — not live date inventory."
          }
        >
          <Zap className="h-3 w-3 shrink-0" />
          {isKo ? "즉시예약(안내)" : "Instant (info)"}
        </span>
      ) : null}

      {showVerified ? (
        <span
          className={cn(
            verifiedClass,
            "absolute right-1.5 top-1.5 sm:right-2 sm:top-2",
          )}
          title={
            isKo
              ? "싱커드 4단계 검증: 현장 방문 → 촬영 실측 → 데이터 검증 → 등록"
              : "THINKAD 4-step verified inventory"
          }
        >
          <ShieldCheck className="h-3 w-3 shrink-0" />
          {isKo ? "검증" : "Verified"}
        </span>
      ) : null}
    </div>
  );
}
