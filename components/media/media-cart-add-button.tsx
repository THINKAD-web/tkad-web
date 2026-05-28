"use client";

import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { cn } from "@/lib/utils";

type Props = {
  inCart: boolean;
  onToggle: () => void;
  /** 그리드 카드 — 짧은 라벨 (담기+ / 담김) */
  gridInline?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 견적서 장바구니 담기 토글 */
export function MediaCartAddButton({
  inCart,
  onToggle,
  gridInline = false,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={cn(mediaActionPillClass(inCart), className)}
      aria-label={inCart ? "담기 해제" : "담기"}
    >
      {gridInline ? (inCart ? "담김" : "담기+") : inCart ? "담김" : "담기"}
    </button>
  );
}
