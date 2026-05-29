"use client";

import { GitCompare } from "lucide-react";
import { useLocale } from "next-intl";
import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { cn } from "@/lib/utils";

type Props = {
  selected: boolean;
  onToggle: () => void;
  /** 그리드 카드 — 짧은 라벨 (비교+ / 비교✓) */
  gridInline?: boolean;
  /** 피드 카드 — 아이콘 + 긴 라벨 */
  feedLabeled?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 비교함(비교 카트) 선택 토글 */
export function MediaCompareSelectButton({
  selected,
  onToggle,
  gridInline = false,
  feedLabeled = false,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const label = feedLabeled
    ? selected
      ? isKo
        ? "비교 해제"
        : "Remove"
      : isKo
        ? "비교 담기"
        : "Compare"
    : gridInline
      ? selected
        ? isKo
          ? "비교✓"
          : "On"
        : isKo
          ? "비교+"
          : "Add"
      : selected
        ? isKo
          ? "비교됨"
          : "On"
        : isKo
          ? "비교"
          : "Add";

  const ariaLabel = selected
    ? isKo
      ? "비교함에서 제거"
      : "Remove from compare"
    : isKo
      ? "비교함에 담기"
      : "Add to compare";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={cn(
        feedLabeled
          ? "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors"
          : mediaActionPillClass(selected),
        feedLabeled &&
          (selected
            ? "border-violet-400/50 bg-violet-500/15 text-violet-700 dark:text-violet-200"
            : "border-gray-200/90 bg-white/90 text-gray-700 hover:bg-gray-50 dark:border-white/12 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12"),
        className,
      )}
      aria-pressed={selected}
      aria-label={ariaLabel}
    >
      {feedLabeled ? (
        <GitCompare className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      ) : null}
      {label}
    </button>
  );
}
