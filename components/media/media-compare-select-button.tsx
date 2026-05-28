"use client";

import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { cn } from "@/lib/utils";

type Props = {
  selected: boolean;
  onToggle: () => void;
  /** 그리드 카드 — 짧은 라벨 (선택+ / 선택✓) */
  gridInline?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 비교 카트 선택 토글 */
export function MediaCompareSelectButton({
  selected,
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
      className={cn(mediaActionPillClass(selected), className)}
      aria-label={selected ? "선택 해제" : "선택"}
    >
      {gridInline ? (selected ? "선택✓" : "선택+") : "선택"}
    </button>
  );
}
