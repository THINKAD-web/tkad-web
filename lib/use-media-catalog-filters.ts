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
      const currentCategory = prev[category] ?? {};
      const nextCategory: Record<string, boolean> = {
        ...currentCategory,
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
    getActiveFiltersCount,
    setFilters,
  };
}

