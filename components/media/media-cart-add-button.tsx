"use client";

import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { cn } from "@/lib/utils";

type Props = {
  inCart: boolean;
  onToggle: () => void;
  className?: string;
};

/** 매체 목록·지도 공통 — 견적서 장바구니 담기 토글 */
export function MediaCartAddButton({ inCart, onToggle, className }: Props) {
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
      {inCart ? "담김" : "담기"}
    </button>
  );
}
