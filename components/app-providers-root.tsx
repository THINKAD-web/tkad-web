"use client";

import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
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

type Props = {
  children: ReactNode;
  admin?: boolean;
};

/**
 * 전역 providers — DOM shell 없이 children 만 감쌈 (RSC main/footer 스트리밍 순서 보존).
 */
export function AppProvidersRoot({ children, admin }: Props) {
  if (admin) {
    return (
      <AuthSessionProvider>
        <ToastProvider>
          <PointToastListener />
          {children}
        </ToastProvider>
      </AuthSessionProvider>
    );
  }

  return (
    <AuthSessionProvider>
      <ToastProvider>
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
    </AuthSessionProvider>
  );
}
