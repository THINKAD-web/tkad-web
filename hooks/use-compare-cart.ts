"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";

export function useCompareCart() {
  const [entries, setEntries] = useState<CompareCartEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(getCompareCartEntries());
    sync();
    return subscribeCompareCart(sync);
  }, []);

  const has = useCallback(
    (mediaId: string) => entries.some((e) => e.id === mediaId),
    [entries],
  );

  const toggle = useCallback((entry: CompareCartEntry) => {
    const prev = getCompareCartEntries();
    const exists = prev.some((e) => e.id === entry.id);
    const next = exists
      ? prev.filter((e) => e.id !== entry.id)
      : [
          ...prev,
          {
            id: entry.id,
            name: entry.name,
            nameEn: entry.nameEn?.trim() ? entry.nameEn : entry.name,
          },
        ];
    setCompareCartEntries(next);
  }, []);

  const clear = useCallback(() => {
    setCompareCartEntries([]);
  }, []);

  return {
    entries,
    count: entries.length,
    has,
    toggle,
    clear,
  };
}
