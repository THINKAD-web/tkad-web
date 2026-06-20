"use client";

import { useMemo } from "react";
import { useIsPro } from "@/hooks/use-is-pro";
import { cartCompareMaxItems } from "@/lib/entitlements/limits";

/** 내 플랜·비교 카트 공통 — PRO 여부에 따른 maxItems */
export function useCartCompareMax() {
  const { isPro, loading } = useIsPro();
  const maxItems = useMemo(() => cartCompareMaxItems(isPro), [isPro]);
  return { maxItems, isPro, loading };
}
