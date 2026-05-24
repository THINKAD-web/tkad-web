"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorizontalScrollGesture } from "@/lib/use-horizontal-scroll-gesture";

type RegionChip = {
  id: string;
  labelKo: string;
  labelEn: string;
  query: string;
  /** CSS gradient for circular thumbnail */
  gradient: string;
  isLocation?: boolean;
};

const REGIONS: RegionChip[] = [
  {
    id: "nearby",
    labelKo: "내 위치",
    labelEn: "Nearby",
    query: "",
    gradient: "from-violet-400 to-violet-600",
    isLocation: true,
  },
  {
    id: "gangnam",
    labelKo: "강남/서초",
    labelEn: "Gangnam",
    query: "강남",
    gradient: "from-rose-400 to-orange-500",
  },
  {
    id: "mapo",
    labelKo: "홍대/마포",
    labelEn: "Hongdae",
    query: "홍대",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    id: "seongsu",
    labelKo: "성수/성동",
    labelEn: "Seongsu",
    query: "성수",
    gradient: "from-teal-400 to-cyan-500",
  },
  {
    id: "downtown",
    labelKo: "강북/도심",
    labelEn: "Downtown",
    query: "명동",
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    id: "busan",
    labelKo: "부산",
    labelEn: "Busan",
    query: "부산",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    id: "daegu",
    labelKo: "대구",
    labelEn: "Daegu",
    query: "대구",
    gradient: "from-emerald-400 to-green-600",
  },
];

type Props = {
  locale: string;
  onSelect?: (query: string) => void;
  activeQuery?: string;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
};

export function RegionImageChips({
  locale,
  onSelect,
  activeQuery,
  showTitle = true,
  compact = false,
  className,
}: Props) {
  const isKo = locale.startsWith("ko");
  const scrollRef = useRef<HTMLUListElement>(null);
  useHorizontalScrollGesture(scrollRef);

  return (
    <div className={className}>
      {showTitle ? (
        <div className="mb-3 flex items-center justify-between px-4 sm:px-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">
            {isKo ? "지역으로 찾기" : "Browse by region"}
          </h3>
          <Link
            href="/my"
            className="text-xs font-medium text-violet-600 dark:text-violet-300"
          >
            {isKo ? "관심 지역 설정" : "Set regions"}
          </Link>
        </div>
      ) : null}
      <ul
        ref={scrollRef}
        className={cn(
          "flex list-none gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          compact ? "" : "px-4 sm:px-0",
        )}
      >
        {REGIONS.map((region) => {
          const label = isKo ? region.labelKo : region.labelEn;
          const active = activeQuery === region.query;
          const size = compact ? "h-12 w-12" : "h-14 w-14";

          const inner = (
            <>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-offset-2 ring-offset-white transition-all dark:ring-offset-gray-950",
                  size,
                  region.gradient,
                  active
                    ? "ring-violet-500"
                    : "ring-transparent hover:ring-gray-200 dark:hover:ring-white/20",
                )}
              >
                {region.isLocation ? (
                  <MapPin className="h-5 w-5 text-white" strokeWidth={2} />
                ) : (
                  <span className="text-[10px] font-bold text-white/90">
                    {label.slice(0, 2)}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "max-w-[4rem] text-center text-[10px] leading-tight",
                  active
                    ? "font-semibold text-violet-600 dark:text-violet-300"
                    : "text-gray-600 dark:text-white/60",
                )}
              >
                {label}
              </span>
            </>
          );

          if (region.isLocation) {
            return (
              <li key={region.id} className="shrink-0">
                <Link
                  href="/media/map"
                  className="flex flex-col items-center gap-1 transition-transform active:scale-95"
                >
                  {inner}
                </Link>
              </li>
            );
          }

          return (
            <li key={region.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect?.(region.query)}
                className="flex flex-col items-center gap-1 transition-transform active:scale-95"
              >
                {inner}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
