"use client";

import { mapFloatingPanelClass } from "@/components/media-map/map-floating-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  districtCount: number;
  className?: string;
};

/** 이동형 서비스 권역 폴리곤 — 근사 범위 안내 (PoC C-②) */
export function MediaMapCoverageOverlayHint({
  isKo = true,
  districtCount,
  className,
}: Props) {
  return (
    <div
      className={cn(
        mapFloatingPanelClass("pointer-events-auto px-3 py-2"),
        className,
      )}
      data-screenshot="media-map-coverage-overlay-hint"
      role="status"
    >
      <p className="tkad-type-note font-semibold leading-snug text-foreground">
        {isKo ? "서비스 권역 (근사)" : "Service area (approx.)"}
      </p>
      <p className="tkad-type-note mt-1 leading-snug text-tkad-secondary">
        {isKo ? (
          <>
            {districtCount}개 행정구역 중심 기준 원형 범위입니다. 실제
            노선·행정 경계와 다를 수 있어요.
          </>
        ) : (
          <>
            {districtCount} district center-based circles — not exact admin
            boundaries or routes.
          </>
        )}
      </p>
    </div>
  );
}
