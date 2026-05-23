"use client";

import type { ReactNode } from "react";
import ToastProvider from "@/components/toast-provider";
import { PointToastListener } from "@/components/points/point-toast-listener";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import TopLoader from "@/components/top-loader";
import { FooterBrutal } from "@/components/public-chrome/footer-brutal";
import DeferredPublicWidgetsGate from "@/components/deferred-public-widgets-gate";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { MobileAppChrome } from "@/components/mobile/mobile-app-chrome";
import { CommandPaletteProvider } from "@/components/navigation/command-palette-provider";
import { ContextNavAsideShell } from "@/components/navigation/context-nav-sidebar";
import { RecentPageTracker } from "@/components/navigation/recent-page-tracker";

type Props = {
  skipLinkLabel: string;
  header: ReactNode;
  children: ReactNode;
};

/**
 * `[locale]/layout` 에서 대부분의 클라이언트 UI를 한 모듈로 묶어 Webpack RSC 청크 꼬임을 줄임.
 */
export default function LocaleRootBody({ skipLinkLabel, header, children }: Props) {
  return (
    <ToastProvider>
      <CommandPaletteProvider>
        <PointToastListener />
        <RecentPageTracker />
        <a href="#main-content" className="skip-link">
          {skipLinkLabel}
        </a>
        <div className="flex min-h-0 flex-1 flex-col">
          <ConditionalPublicChrome>
            <TopLoader />
            <div className="hidden md:block">{header}</div>
          </ConditionalPublicChrome>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <ConditionalPublicChrome>
              <ContextNavAsideShell />
            </ConditionalPublicChrome>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <main id="main-content" className="tkad-app-ui flex min-h-0 flex-1 flex-col">
                <MobileAppChrome>{children}</MobileAppChrome>
              </main>
              <ConditionalPublicChrome>
                <div className="hidden md:block">
                  <FooterBrutal />
                </div>
                <DeferredPublicWidgetsGate />
              </ConditionalPublicChrome>
            </div>
          </div>
        </div>
        <PwaInstallBanner />
      </CommandPaletteProvider>
    </ToastProvider>
  );
}
