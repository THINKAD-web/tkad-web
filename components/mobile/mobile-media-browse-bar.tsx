"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorizontalScrollGesture } from "@/lib/use-horizontal-scroll-gesture";

const DEFAULT_CHIPS_KO = [
  "전체",
  "강남",
  "홍대",
  "성수",
  "부산",
  "잠실",
  "명동",
  "판교",
  "신촌",
  "이태원",
];

const DEFAULT_CHIPS_EN = [
  "All",
  "Gangnam",
  "Hongdae",
  "Seongsu",
  "Busan",
  "Jamsil",
  "Myeongdong",
  "Pangyo",
  "Sinchon",
  "Itaewon",
];

type Props = {
  isKo: boolean;
  activeChip: string;
  onChipChange: (chip: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOptions: { value: string; label: string }[];
  resultCount?: number;
};

export function MobileMediaBrowseBar({
  isKo,
  activeChip,
  onChipChange,
  sortBy,
  onSortChange,
  sortOptions,
  resultCount,
}: Props) {
  const scrollRef = useRef<HTMLUListElement>(null);
  useHorizontalScrollGesture(scrollRef);

  const chips = isKo ? DEFAULT_CHIPS_KO : DEFAULT_CHIPS_EN;
  const allLabel = chips[0];

  return (
    <div className="space-y-3 md:hidden">
      <ul
        ref={scrollRef}
        className="flex list-none gap-2 overflow-x-auto overscroll-x-contain px-4 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehavior: "contain" }}
      >
        {chips.map((chip) => {
          const isAll = chip === allLabel;
          const active = activeChip === chip || (activeChip === "" && isAll);
          return (
            <li key={chip} className="shrink-0">
              <button
                type="button"
                onClick={() => onChipChange(isAll ? "" : chip)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 active:scale-95",
                  active
                    ? "bg-violet-500 text-white shadow-sm shadow-violet-500/25"
                    : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/80",
                )}
              >
                {chip}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 px-4">
        <label className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-gray-950">
          <span className="shrink-0 text-xs text-gray-500 dark:text-white/50">
            {isKo ? "정렬" : "Sort"}
          </span>
          <select
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none dark:text-white"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/media/map"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-transform duration-150 active:scale-95 dark:border-white/10 dark:bg-gray-950 dark:text-white"
        >
          <MapIcon className="h-4 w-4 text-violet-500" />
          {isKo ? "지도 보기" : "Map"}
        </Link>
      </div>

      {resultCount != null ? (
        <p className="px-4 text-xs text-gray-500 dark:text-white/50">
          {isKo ? `${resultCount}개 매체` : `${resultCount} media`}
        </p>
      ) : null}
    </div>
  );
}
