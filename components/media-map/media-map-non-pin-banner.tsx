"use client";

import { Info } from "lucide-react";
import { mapFloatingPanelClass } from "@/components/media-map/map-floating-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  mobileListCount: number;
  className?: string;
};

/** 이동형 등 지도 핀 없는 매체 — 버그 오해 방지 배너 */
export function MediaMapNonPinBanner({
  isKo,
  mobileListCount,
  className,
}: Props) {
  if (mobileListCount <= 0) return null;

  const n = isKo
    ? mobileListCount.toLocaleString("ko-KR")
    : mobileListCount.toLocaleString();

  return (
    <div
      className={cn(
        mapFloatingPanelClass(
          "pointer-events-none absolute z-[10] flex items-start gap-2 px-3 py-2",
        ),
        "left-3 right-3 top-3 sm:left-4 sm:right-auto sm:max-w-md md:top-14",
        className,
      )}
      role="status"
      data-screenshot="media-map-non-pin-banner"
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--qp-accent)]"
        aria-hidden
      />
      <p className="tkad-type-meta font-medium text-foreground">
        {isKo
          ? `이동형 ${n}건은 고정 위치가 없어 지도 핀 대신 목록에만 표시됩니다.`
          : `${n} mobile listings have no map pins — see the list.`}
      </p>
    </div>
  );
}
