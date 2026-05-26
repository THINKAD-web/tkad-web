"use client";

import { Suspense, type ReactNode } from "react";
import { BottomTabBar } from "@/components/mobile/bottom-tab-bar";
import { MobileSearchModal } from "@/components/mobile/mobile-search-modal";
import { MobileSearchProvider } from "@/components/mobile/mobile-search-context";
import { MobileDetailChromeProvider } from "@/components/mobile/mobile-detail-chrome-context";
import { PwaSplashScreen } from "@/components/mobile/pwa-splash-screen";
import { MobileKeyboardProvider } from "@/components/mobile/mobile-keyboard-provider";
import { PushHapticListener } from "@/components/mobile/push-haptic-listener";
import { SubpageRelatedChips } from "@/components/navigation/subpage-related-chips";
import { QuickActionBarMobile } from "@/components/navigation/quick-action-bar";

type Props = {
  children: ReactNode;
};

/**
 * Mobile-only chrome: sticky header, bottom tab bar, search modal.
 * Desktop (md+) renders children only — no extra wrappers.
 */
export function MobileAppChrome({ children }: Props) {
  return (
    <MobileSearchProvider>
      <MobileDetailChromeProvider>
        <MobileKeyboardProvider />
        <PushHapticListener />
        <PwaSplashScreen />
        <div className="flex min-h-0 flex-1 flex-col md:contents">
          <Suspense fallback={null}>
            <SubpageRelatedChips />
          </Suspense>
          <div className="flex min-h-0 flex-1 flex-col pb-28 md:pb-0 tkad-mobile-scroll">
            {children}
          </div>
          <QuickActionBarMobile />
          <BottomTabBar />
          <MobileSearchModal />
        </div>
      </MobileDetailChromeProvider>
    </MobileSearchProvider>
  );
}
