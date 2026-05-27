import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { routing } from "@/i18n/routing";
import {
  defaultOgImages,
  pageAlternates,
  siteKeywords,
  siteUrl,
} from "@/lib/seo";
import { buildStructuredDataGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme-auto";
import LocaleRootBody from "@/components/locale-root-body";
import { SiteHeader } from "@/components/public-chrome/site-header";
import { OnboardingProgressBar } from "@/components/onboarding/onboarding-progress-bar";
import { PublicAnalyticsLoader } from "@/components/public-analytics-loader";
import { AbGaVariantSync } from "@/components/ab/ab-ga-variant";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { SpeedInsightsLoader } from "@/components/speed-insights-loader";
import { OpsAnalyticsTracker } from "@/components/tracking/ops-analytics-tracker";
import { fontClassNames } from "@/lib/fonts";
import "../globals.css";

/** ISR: marketing subtree; admin/client opt out via their own layouts. */
export const revalidate = 3600;

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // PWA: 노치/홈인디케이터 영역까지 풀-블리드 (env(safe-area-inset-*) 활용)
  viewportFit: "cover" as const,
  themeColor: "#020202",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const metadataBase =
    process.env.VERCEL_ENV === "production"
      ? new URL("https://tkad.co.kr")
      : new URL("https://tkad-web.vercel.app");

  const titleDefault =
    locale === "ko"
      ? "THINKAD | 싱커드 - 한국 OOH 광고 에이전시"
      : "THINKAD | Korea OOH Advertising Agency";
  const description =
    locale === "ko"
      ? "대한민국 No.1 OOH 광고 에이전시. 전국 500+ 검증된 옥외광고 매체 검색, 데이터 기반 캠페인 컨설팅, 계약~사후관리 원스톱 서비스."
      : "Korea's leading OOH agency. Search 500+ verified OOH media nationwide, data-driven campaign consulting, and end-to-end execution.";

  const googleVer =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const naverVer =
    process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION?.trim() ||
    process.env.NAVER_SITE_VERIFICATION?.trim();

  return {
    title: {
      default: titleDefault,
      template: "%s | THINKAD",
    },
    description,
    metadataBase,
    keywords: siteKeywords(locale),
    authors: [{ name: "THINKAD 싱커드", url: siteUrl }],
    creator: "THINKAD 싱커드",
    publisher: "THINKAD 싱커드",
    formatDetection: { telephone: true, email: true, address: true },
    // PWA — iOS 홈 화면 추가 시 풀-스크린 모드 + 상태바 스타일.
    // capable: true 가 모바일 사파리에서 standalone 모드 진입 신호.
    appleWebApp: {
      capable: true,
      title: locale === "ko" ? "싱커드" : "THINKAD",
      statusBarStyle: "black-translucent",
    },
    manifest: "/manifest.webmanifest",
    icons: {
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    alternates: pageAlternates(locale, ""),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(googleVer ? { verification: { google: googleVer } } : {}),
    openGraph: {
      type: "website",
      locale: locale === "ko" ? "ko_KR" : "en_US",
      alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
      siteName: locale === "ko" ? "THINKAD 싱커드" : "THINKAD",
      url: `/${locale}`,
      title: titleDefault,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 싱커드 — 대한민국 No.1 OOH 광고 에이전시",
        en: "THINKAD — Korea's leading OOH advertising agency",
      }),
    },
    twitter: {
      card: "summary_large_image",
      site: "@thinkad_kr",
      creator: "@thinkad_kr",
      title: titleDefault,
      description,
    },
    other: {
      ...(naverVer ? { "naver-site-verification": naverVer } : {}),
      "theme-color": "#020202",
      "msapplication-TileColor": "#020202",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = await resolveLocaleParam(params);
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const structuredData = buildStructuredDataGraph(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontClassNames} flex min-h-full min-h-[100dvh] flex-col font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <JsonLd data={structuredData} />
        <WebVitalsReporter />
        <SpeedInsightsLoader />
        <PublicAnalyticsLoader />
        <AbGaVariantSync />
        <ThemeProvider>
          <NextIntlClientProvider
            locale={locale}
            messages={messages}
            timeZone="Asia/Seoul"
          >
            <OpsAnalyticsTracker />
            <LocaleRootBody
              skipLinkLabel={
                locale === "ko" ? "본문으로 건너뛰기" : "Skip to main content"
              }
              header={
                <>
                  <SiteHeader />
                  <OnboardingProgressBar />
                </>
              }
            >
              {children}
            </LocaleRootBody>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
