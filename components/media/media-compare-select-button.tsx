"use client";

import { Check, GitCompare, Plus } from "lucide-react";
import { useLocale } from "next-intl";
import {
  mediaActionBlockClass,
  mediaActionPillClass,
} from "@/components/media/media-action-pill";
import { useCompareCart } from "@/hooks/use-compare-cart";
import type { CompareCartEntry } from "@/lib/compare-cart-client";
import { cn } from "@/lib/utils";

type Props = {
  /** 지정 시 compare cart를 직접 구독 — 카드·하단바와 즉시 동기화 */
  mediaId?: string;
  compareEntry?: CompareCartEntry;
  /** 레거시: mediaId 없을 때만 사용 */
  selected?: boolean;
  onToggle?: () => void;
  /** 그리드 카드 — 짧은 라벨 (비교+ / 비교중 ✓) */
  gridInline?: boolean;
  /** 피드 카드 — 아이콘 + 긴 라벨 */
  feedLabeled?: boolean;
  /** 아이콘만 (릴스 등 정사각 버튼) */
  iconOnly?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 비교함(비교 카트) 선택 토글 */
export function MediaCompareSelectButton({
  mediaId,
  compareEntry,
  selected: selectedProp = false,
  onToggle,
  gridInline = false,
  feedLabeled = false,
  iconOnly = false,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const compareCart = useCompareCart();

  const usesStore = mediaId != null;
  const selected = usesStore ? compareCart.has(mediaId) : selectedProp;

  function handleToggle() {
    if (usesStore) {
      const entry: CompareCartEntry = compareEntry ?? {
        id: mediaId!,
        name: mediaId!,
        nameEn: mediaId!,
      };
      compareCart.toggle(entry);
      return;
    }
    onToggle?.();
  }

  const label = feedLabeled
    ? selected
      ? isKo
        ? "비교중 ✓"
        : "Comparing ✓"
      : isKo
        ? "비교 담기"
        : "Compare"
    : gridInline
      ? selected
        ? isKo
          ? "비교중 ✓"
          : "On ✓"
        : isKo
          ? "비교"
          : "Compare"
      : selected
        ? isKo
          ? "비교중 ✓"
          : "On ✓"
        : isKo
          ? "비교"
          : "Compare";

  const ariaLabel = selected
    ? isKo
      ? "비교함에서 제거"
      : "Remove from compare"
    : isKo
      ? "비교함에 담기"
      : "Add to compare";

  const showCheck = selected && (gridInline || feedLabeled || iconOnly);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleToggle();
      }}
      className={cn(
        iconOnly
          ? cn(
              "inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl border transition-colors",
              selected
                ? "border-hermes/30 bg-hermes/15 text-white"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            )
          : feedLabeled
            ? mediaActionBlockClass(
                selected,
                "compare",
                "h-8 flex-1 px-2 tkad-type-caption",
              )
            : mediaActionPillClass(selected, "compare"),
        className,
      )}
      aria-pressed={selected}
      aria-label={ariaLabel}
    >
      {iconOnly ? (
        selected ? (
          <Check className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <GitCompare className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        )
      ) : feedLabeled ? (
        <GitCompare className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      ) : null}
      {!iconOnly ? (
        <>
          {showCheck ? (
            <Check className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
          ) : !feedLabeled && !selected ? (
            <Plus className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
          ) : null}
          {label}
        </>
      ) : null}
    </button>
  );
}
