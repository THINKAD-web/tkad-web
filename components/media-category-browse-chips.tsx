"use client";

import { cn } from "@/lib/utils";
import {
  BROWSE_CATEGORY_CHIPS,
  type BrowseCategoryChip,
  categoryLabel,
} from "@/lib/media-categories";

export type { BrowseCategoryChip };

const CHIP_LABELS: Record<BrowseCategoryChip, { ko: string; en: string; icon: string }> = {
  all: { ko: "전체", en: "All", icon: "" },
  subway: { ko: "지하철", en: "Subway", icon: "🚇" },
  bus: { ko: "버스", en: "Bus", icon: "🚌" },
  billboard: { ko: "전광판", en: "Billboard", icon: "📺" },
  dooh: { ko: "DOOH", en: "DOOH", icon: "💡" },
  campus: { ko: "캠퍼스", en: "Campus", icon: "🎓" },
  retail: { ko: "쇼핑몰", en: "Retail", icon: "🏬" },
  local: { ko: "로컬", en: "Local", icon: "🏘" },
};

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
        const meta = CHIP_LABELS[chip];
        const label =
          chip === "all"
            ? isKo
              ? meta.ko
              : meta.en
            : `${meta.icon} ${isKo ? meta.ko : meta.en}`.trim();
        const selected = active === chip;
        return (
          <button
            key={chip}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(chip)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              selected
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-white/15 dark:bg-white/5 dark:text-white/80",
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
