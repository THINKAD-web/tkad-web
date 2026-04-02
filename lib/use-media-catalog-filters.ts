import { useState } from "react";
import type { TargetAgeBucket } from "@/lib/media-filter-advanced";

export type MediaCatalogFiltersState = {
  targetAge: Partial<Record<TargetAgeBucket, boolean>>;
  targetTraits: Partial<Record<string, boolean>>;
  industry: Partial<Record<string, boolean>>;
  size: Partial<Record<string, boolean>>;
  duration: Partial<Record<string, boolean>>;
  exposureTime: Partial<Record<string, boolean>>;
  specialFeature: Partial<Record<string, boolean>>;
  /** /media 정밀 필터 v2 — 핫스팟·포맷 등 */
  areaSpot: Partial<Record<string, boolean>>;
  mediaFormat: Partial<Record<string, boolean>>;
  targetPersona: Partial<Record<string, boolean>>;
  industryTag: Partial<Record<string, boolean>>;
  campaignPurpose: Partial<Record<string, boolean>>;
};

const EMPTY_MAP: Partial<Record<string, boolean>> = {};

const initialFilters: MediaCatalogFiltersState = {
  targetAge: {} as Partial<Record<TargetAgeBucket, boolean>>,
  targetTraits: { ...EMPTY_MAP },
  industry: { ...EMPTY_MAP },
  size: { ...EMPTY_MAP },
  duration: { ...EMPTY_MAP },
  exposureTime: { ...EMPTY_MAP },
  specialFeature: { ...EMPTY_MAP },
  areaSpot: { ...EMPTY_MAP },
  mediaFormat: { ...EMPTY_MAP },
  targetPersona: { ...EMPTY_MAP },
  industryTag: { ...EMPTY_MAP },
  campaignPurpose: { ...EMPTY_MAP },
};

export type ToggleMediaCatalogFilter = <
  K extends keyof MediaCatalogFiltersState,
>(
  category: K,
  key: string,
) => void;

export function useMediaCatalogFilters() {
  const [filters, setFilters] = useState<MediaCatalogFiltersState>(
    initialFilters,
  );

  const toggleFilter: ToggleMediaCatalogFilter = (category, key) => {
    setFilters((prev) => {
      const currentCategory = (prev[category] ?? {}) as Record<string, boolean | undefined>;
      const nextCategory: Record<string, boolean> = {
        ...(currentCategory as Record<string, boolean>),
        [key]: !currentCategory[key],
      };
      if (!nextCategory[key]) {
        delete nextCategory[key];
      }
      return {
        ...prev,
        [category]: nextCategory,
      };
    });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const clearCategory = (category: keyof MediaCatalogFiltersState) => {
    setFilters((prev) => ({
      ...prev,
      [category]:
        category === "targetAge"
          ? ({} as MediaCatalogFiltersState["targetAge"])
          : {},
    }));
  };

  const selectAllInCategory = (
    category: keyof MediaCatalogFiltersState,
    keys: readonly string[],
  ) => {
    setFilters((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of keys) next[k] = true;
      return {
        ...prev,
        [category]: next as MediaCatalogFiltersState[typeof category],
      };
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    for (const category of Object.values(filters)) {
      for (const v of Object.values(category)) {
        if (v) count += 1;
      }
    }
    return count;
  };

  // 상태 관리 최적화 완료: 중앙 집중식 필터 훅

  // console.log("useMediaCatalogFilters state", filters);

  return {
    filters,
    toggleFilter,
    resetFilters,
    clearCategory,
    selectAllInCategory,
    getActiveFiltersCount,
    setFilters,
  };
}

