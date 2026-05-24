"use client";

import { cn } from "@/lib/utils";
import {
  BROWSE_CATEGORY_CHIPS,
  type BrowseCategoryChip,
  categoryLabel,
} from "@/lib/media-categories";

export type { BrowseCategoryChip };

type Props = {
  locale: string;
  active: BrowseCategoryChip;
  onChange: (chip: BrowseCategoryChip) => void;
  className?: string;
};

export function MediaCategoryBrowseChips({
  locale,
  active,
  onChange,
  className,
}: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={isKo ? "매체 카테고리" : "Media categories"}
    >
      {BROWSE_CATEGORY_CHIPS.map((chip) => {
        const label =
          chip === "all"
            ? isKo
              ? "전체"
              : "All"
            : categoryLabel(chip, locale);
        const selected = active === chip;
        return (
          <button
            key={chip}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(chip)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              selected
                ? "bg-violet-500 text-white shadow-sm shadow-violet-500/25"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function chipLandingHref(chip: BrowseCategoryChip): string | null {
  if (chip === "all") return null;
  const map: Partial<Record<BrowseCategoryChip, string>> = {
    subway: "/media/category/subway",
    bus: "/media/category/bus",
    billboard: "/media/category/billboard",
    dooh: "/media/category/dooh",
    campus: "/media/category/campus",
    retail: "/media/category/retail",
    local: "/media/category/local",
  };
  return map[chip] ?? `/media/category/${chip}`;
}

export { categoryLabel };
