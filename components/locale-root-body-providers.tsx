"use client";

import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import ToastProvider from "@/components/toast-provider";
import { PointToastListener } from "@/components/points/point-toast-listener";
import { ContactChannelProvider } from "@/components/contact/contact-channel-provider";
import { CommandPaletteProvider } from "@/components/navigation/command-palette-provider";
import { RecentPageTracker } from "@/components/navigation/recent-page-tracker";
import { MobileAppProviders } from "@/components/mobile/mobile-app-providers";
import { MobileAppOverlays } from "@/components/mobile/mobile-app-overlays";

type Props = {
  children: ReactNode;
  admin?: boolean;
};

/** @deprecated PublicPageChrome + AppProvidersRoot 사용. AuthSessionProvider 는 PublicPageChrome. */
export function LocaleRootBodyProviders({ children, admin }: Props) {
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
            <MobileAppProviders>
              {children}
              <MobileAppOverlays />
            </MobileAppProviders>
          </CommandPaletteProvider>
        </ContactChannelProvider>
      </ToastProvider>
    </AuthSessionProvider>
  );
}
