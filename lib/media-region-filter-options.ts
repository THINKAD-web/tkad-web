import type { MediaItem } from "@/lib/media-data";

const REGION_ORDER = ["all", "seoul", "busan", "jeju", "national"] as const;

/**
 * 카탈로그에 실제로 등장하는 지역 값으로 필터 옵션을 만듭니다.
 * 라벨은 `next-intl` `useTranslations("media")` 로 번역합니다.
 */
export function buildMediaRegionFilterOptions(
  catalog: MediaItem[],
  tMedia: (key: string) => string,
): { value: string; label: string }[] {
  const counts = new Map<string, number>();
  for (const m of catalog) {
    const r = (m.region ?? "national").trim() || "national";
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const sorted = [...counts.keys()].sort((a, b) => {
    const ai = REGION_ORDER.indexOf(a as (typeof REGION_ORDER)[number]);
    const bi = REGION_ORDER.indexOf(b as (typeof REGION_ORDER)[number]);
    if (ai !== -1 || bi !== -1)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
  const known = new Set(["seoul", "busan", "jeju", "national"]);
  return [
    { value: "all", label: tMedia("allRegions") },
    ...sorted
      .filter((x) => x !== "all")
      .map((value) => ({
        value,
        label: known.has(value)
          ? tMedia(`regions.${value}` as "regions.seoul")
          : value,
      })),
  ];
}
