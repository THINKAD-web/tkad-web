import type { ReactNode } from "react";
import { Suspense } from "react";
import { PublicPageChrome } from "@/components/public-page-chrome";
import { SiteHeader } from "@/components/public-chrome/site-header";
import { OnboardingProgressBar } from "@/components/onboarding/onboarding-progress-bar";
import { GnbAccentSetTrialSync } from "@/components/design/gnb-accent-set-trial-sync";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  const isKo = locale === "ko" || locale.startsWith("ko");

  return (
    <PublicPageChrome
      skipLinkLabel={isKo ? "본문으로 건너뛰기" : "Skip to main content"}
      header={
        <Suspense
          fallback={<div className="h-14 shrink-0 md:h-16" aria-hidden />}
        >
          <GnbAccentSetTrialSync />
          <SiteHeader />
          <OnboardingProgressBar />
        </Suspense>
      }
    >
      {children}
    </PublicPageChrome>
  );
}
