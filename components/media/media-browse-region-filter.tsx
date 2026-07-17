"use client";

import { cn } from "@/lib/utils";

export type RegionChip = {
  id: string;
  labelKo: string;
  labelEn: string;
  query: string;
  /** 서울 선택 시 구 단위 서브칩 */
  subChips?: { id: string; labelKo: string; labelEn: string; query: string }[];
};

export const MEDIA_REGION_CHIPS: RegionChip[] = [
  { id: "all", labelKo: "전국", labelEn: "Nationwide", query: "" },
  {
    id: "seoul",
    labelKo: "서울",
    labelEn: "Seoul",
    query: "서울",
    subChips: [
      { id: "gangnam", labelKo: "강남/서초", labelEn: "Gangnam", query: "강남" },
      { id: "mapo", labelKo: "마포/홍대", labelEn: "Mapo", query: "마포" },
      { id: "seongdong", labelKo: "성동/성수", labelEn: "Seongdong", query: "성동" },
      { id: "downtown", labelKo: "도심", labelEn: "Downtown", query: "중구" },
    ],
  },
  { id: "gyeonggi", labelKo: "경기", labelEn: "Gyeonggi", query: "경기" },
  { id: "busan", labelKo: "부산", labelEn: "Busan", query: "부산" },
  { id: "daegu", labelKo: "대구", labelEn: "Daegu", query: "대구" },
  { id: "other", labelKo: "기타", labelEn: "Other", query: "기타" },
];

type Props = {
  locale: string;
  activeRegion: string;
  activeSubRegion?: string;
  onRegionChange: (query: string, regionId: string) => void;
  onSubRegionChange?: (query: string, subId: string) => void;
  className?: string;
};

export function MediaBrowseRegionFilter({
  locale,
  activeRegion,
  activeSubRegion,
  onRegionChange,
  onSubRegionChange,
  className,
}: Props) {
  const isKo = locale.startsWith("ko");
  const seoulChip = MEDIA_REGION_CHIPS.find((c) => c.id === "seoul");
  const showSeoulSubs =
    activeRegion === "seoul" && seoulChip?.subChips && seoulChip.subChips.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {MEDIA_REGION_CHIPS.map((chip) => {
          const active = activeRegion === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onRegionChange(chip.query, chip.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                active
                  ? "bg-hermes text-white shadow-sm shadow-hermes/25"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
              )}
            >
              {isKo ? chip.labelKo : chip.labelEn}
            </button>
          );
        })}
      </div>
      {showSeoulSubs && seoulChip?.subChips ? (
        <div className="flex flex-wrap gap-2 pl-1">
          {seoulChip.subChips.map((sub) => {
            const active = activeSubRegion === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubRegionChange?.(sub.query, sub.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors sm:text-xs",
                  active
                    ? "border-hermes/30 bg-hermes/15 text-hermes"
                    : "border-gray-200 text-gray-600 dark:border-white/15 dark:text-white/70",
                )}
              >
                {isKo ? sub.labelKo : sub.labelEn}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
