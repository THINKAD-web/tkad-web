"use client";

import type { ReactNode } from "react";
import ToastProvider from "@/components/toast-provider";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import TopLoader from "@/components/top-loader";
import { FooterBrutal } from "@/components/public-chrome/footer-brutal";
import { PublicNavAside } from "@/components/public-chrome/public-nav-aside";
import DeferredPublicWidgetsGate from "@/components/deferred-public-widgets-gate";
import PwaRegister from "@/components/pwa-register";
import PageTransition from "@/components/page-transition";

type Props = {
  skipLinkLabel: string;
  header: ReactNode;
  children: ReactNode;
};

/**
 * `[locale]/layout` 에서 대부분의 클라이언트 UI를 한 모듈로 묶어 Webpack RSC 청크 꼬임을 줄임.
 * `NextIntlClientProvider` / `ThemeProvider` 는 layout 에서 별도 import — next-intl 컨텍스트 이중 번들 방지.
 */
export default function LocaleRootBody({ skipLinkLabel, header, children }: Props) {
  return (
    <ToastProvider>
      <a href="#main-content" className="skip-link">
        {skipLinkLabel}
      </a>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ConditionalPublicChrome>
          <PublicNavAside />
        </ConditionalPublicChrome>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ConditionalPublicChrome>
            <TopLoader />
            {header}
          </ConditionalPublicChrome>
          <main id="main-content" className="flex min-h-0 flex-1 flex-col">
            <PageTransition>{children}</PageTransition>
          </main>
          <ConditionalPublicChrome>
            <FooterBrutal />
            <DeferredPublicWidgetsGate />
          </ConditionalPublicChrome>
        </div>
      </div>
      <PwaRegister />
    </ToastProvider>
  );
}
