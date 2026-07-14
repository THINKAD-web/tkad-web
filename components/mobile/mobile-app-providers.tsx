"use client";

import type { ReactNode } from "react";
import { MobileSearchProvider } from "@/components/mobile/mobile-search-context";
import { MobileDetailChromeProvider } from "@/components/mobile/mobile-detail-chrome-context";
import { PwaSplashScreen } from "@/components/mobile/pwa-splash-screen";
import { MobileKeyboardProvider } from "@/components/mobile/mobile-keyboard-provider";
import { PushHapticListener } from "@/components/mobile/push-haptic-listener";

/** 모바일 context providers — children 을 추가 wrapper 없이 감쌈 */
export function MobileAppProviders({ children }: { children: ReactNode }) {
  return (
    <MobileSearchProvider>
      <MobileDetailChromeProvider>
        <MobileKeyboardProvider />
        <PushHapticListener />
        <PwaSplashScreen />
        {children}
      </MobileDetailChromeProvider>
    </MobileSearchProvider>
  );
}
