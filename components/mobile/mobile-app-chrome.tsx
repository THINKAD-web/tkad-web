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
        <div className="flex flex-col md:contents">
          <Suspense fallback={null}>
            <SubpageRelatedChips />
          </Suspense>
          <div className="flex flex-col tkad-mobile-scroll md:pb-0">
            {children}
          </div>
          <Suspense fallback={null}>
            <QuickActionBarMobile />
          </Suspense>
          <BottomTabBar />
          <MobileSearchModal />
        </div>
      </MobileDetailChromeProvider>
    </MobileSearchProvider>
  );
}
