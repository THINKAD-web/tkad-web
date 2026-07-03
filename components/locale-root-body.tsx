"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ToastProvider from "@/components/toast-provider";
import { PointToastListener } from "@/components/points/point-toast-listener";
import { ContactChannelProvider } from "@/components/contact/contact-channel-provider";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import TopLoader from "@/components/top-loader";
import { FooterBrutal } from "@/components/public-chrome/footer-brutal";
import DeferredPublicWidgetsGate from "@/components/deferred-public-widgets-gate";
import { MobileAppChrome } from "@/components/mobile/mobile-app-chrome";
import { CommandPaletteProvider } from "@/components/navigation/command-palette-provider";
import { ContextNavAsideShell } from "@/components/navigation/context-nav-sidebar";
import { RecentPageTracker } from "@/components/navigation/recent-page-tracker";

type Props = {
  skipLinkLabel: string;
  header: ReactNode;
  children: ReactNode;
};

function isAdminPathname(pathname: string | null): boolean {
  return pathname != null && /\/(?:ko|en)\/admin(?:\/|$)/.test(pathname);
}

/**
 * `[locale]/layout` 에서 대부분의 클라이언트 UI를 한 모듈로 묶어 Webpack RSC 청크 꼬임을 줄임.
 * Admin 은 자체 AdminShell 이 있으므로 공개용 모바일/네비 chrome 은 생략합니다.
 */
export default function LocaleRootBody({ skipLinkLabel, header, children }: Props) {
  const pathname = usePathname();
  const isAdmin = isAdminPathname(pathname);

  if (isAdmin) {
    return (
      <ToastProvider>
        <PointToastListener />
        {children}
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ContactChannelProvider>
        <CommandPaletteProvider>
          <PointToastListener />
          <RecentPageTracker />
          <a href="#main-content" className="skip-link">
            {skipLinkLabel}
          </a>
          <div className="flex min-h-0 flex-1 flex-col">
            <ConditionalPublicChrome>
              <TopLoader />
              {header}
            </ConditionalPublicChrome>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <ConditionalPublicChrome>
                <ContextNavAsideShell />
              </ConditionalPublicChrome>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <main
                  id="main-content"
                  className="tkad-app-ui flex flex-col md:min-h-0 md:flex-1"
                >
                  <MobileAppChrome>{children}</MobileAppChrome>
                </main>
                <ConditionalPublicChrome>
                  <FooterBrutal />
                  <DeferredPublicWidgetsGate />
                </ConditionalPublicChrome>
              </div>
            </div>
          </div>
        </CommandPaletteProvider>
      </ContactChannelProvider>
    </ToastProvider>
  );
}
