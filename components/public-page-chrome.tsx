import type { ReactNode } from "react";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import TopLoader from "@/components/top-loader";
import { FooterBrutal } from "@/components/public-chrome/footer-brutal";
import DeferredPublicWidgetsGate from "@/components/deferred-public-widgets-gate";
import { ContextNavAsideShell } from "@/components/navigation/context-nav-sidebar";
import { AppProvidersRoot } from "@/components/app-providers-root";
import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import { MobileChromeOverlayProvider } from "@/components/mobile/mobile-chrome-overlay-context";

type Props = {
  skipLinkLabel: string;
  header: ReactNode;
  children: ReactNode;
};

/** 공개 site chrome — 서버 shell (main → footer 순서 고정) */
export function PublicPageChrome({ skipLinkLabel, header, children }: Props) {
  return (
    <AuthSessionProvider>
      <MobileChromeOverlayProvider>
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
              className="tkad-app-ui flex min-w-0 flex-col max-md:overflow-x-clip max-md:tkad-mobile-scroll md:min-h-0 md:flex-1 md:overflow-visible"
            >
              <AppProvidersRoot>{children}</AppProvidersRoot>
            </main>
            <ConditionalPublicChrome>
              <FooterBrutal />
              <DeferredPublicWidgetsGate />
            </ConditionalPublicChrome>
          </div>
        </div>
      </div>
      </MobileChromeOverlayProvider>
    </AuthSessionProvider>
  );
}
