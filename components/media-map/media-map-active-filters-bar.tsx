"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MediaMapActiveFilterChip,
  MediaMapActiveFilterKey,
} from "@/lib/media-map/active-filter-chips";

type Props = {
  chips: MediaMapActiveFilterChip[];
  onRemove: (key: MediaMapActiveFilterKey) => void;
  onClearAll: () => void;
  isKo?: boolean;
  className?: string;
};

export function MediaMapActiveFiltersBar({
  chips,
  onRemove,
  onClearAll,
  isKo = true,
  className,
}: Props) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="scrollbar-hide -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-gray-700 dark:border-white/12 dark:bg-white/8 dark:text-white/85"
          >
            <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{chip.label}</span>
            <button
              type="button"
              onClick={() => onRemove(chip.key)}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={
                isKo ? `${chip.label} 필터 제거` : `Remove ${chip.label} filter`
              }
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
        >
          <X className="h-3 w-3" aria-hidden />
          {isKo ? "필터 초기화" : "Clear all"}
        </button>
      </div>
    </div>
  );
}
