"use client";

import { Suspense } from "react";
import { BottomTabBar } from "@/components/mobile/bottom-tab-bar";
import { MobileSearchModal } from "@/components/mobile/mobile-search-modal";
import { SubpageRelatedChips } from "@/components/navigation/subpage-related-chips";

/** 모바일 전용 오버레이 — main children 슬롯을 감싸지 않음 */
export function MobileAppOverlays() {
  return (
    <>
      <Suspense fallback={null}>
        <SubpageRelatedChips />
      </Suspense>
      <BottomTabBar />
      <MobileSearchModal />
    </>
  );
}
