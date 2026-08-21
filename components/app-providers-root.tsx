"use client";

import type { ReactNode } from "react";
import ToastProvider from "@/components/toast-provider";
import { PointToastListener } from "@/components/points/point-toast-listener";
import { ContactChannelProvider } from "@/components/contact/contact-channel-provider";
import { CommandPaletteProvider } from "@/components/navigation/command-palette-provider";
import { RecentPageTracker } from "@/components/navigation/recent-page-tracker";
import { MobileSearchProvider } from "@/components/mobile/mobile-search-context";
import { MobileDetailChromeProvider } from "@/components/mobile/mobile-detail-chrome-context";
import { MobileKeyboardProvider } from "@/components/mobile/mobile-keyboard-provider";
import { PushHapticListener } from "@/components/mobile/push-haptic-listener";
import { PwaSplashScreen } from "@/components/mobile/pwa-splash-screen";
import { MobileAppOverlays } from "@/components/mobile/mobile-app-overlays";
import { PlanCartLegacyMigrate } from "@/components/plan/plan-cart-legacy-migrate";

type Props = {
  children: ReactNode;
  admin?: boolean;
};

/**
 * 전역 providers — DOM shell 없이 children 만 감쌈.
 * PublicPageChrome 에서는 헤더+본문+푸터를 한 번에 넘긴다 (헤더 돋보기가
 * CommandPaletteProvider 안에 있어야 클릭이 동작). AuthSessionProvider 는
 * PublicPageChrome 에서 그 바깥을 감쌈.
 */
export function AppProvidersRoot({ children, admin }: Props) {
  if (admin) {
    return (
      <ToastProvider>
        <PointToastListener />
        {children}
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <PlanCartLegacyMigrate />
      <ContactChannelProvider>
        <CommandPaletteProvider>
          <PointToastListener />
          <RecentPageTracker />
          <MobileSearchProvider>
            <MobileDetailChromeProvider>
              <MobileKeyboardProvider />
              <PushHapticListener />
              <PwaSplashScreen />
              {children}
              <MobileAppOverlays />
            </MobileDetailChromeProvider>
          </MobileSearchProvider>
        </CommandPaletteProvider>
      </ContactChannelProvider>
    </ToastProvider>
  );
}
