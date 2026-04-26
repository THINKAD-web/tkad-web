import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { routing } from "@/i18n/routing";
import { defaultOgImages, pageAlternates, siteUrl } from "@/lib/seo";
import { buildStructuredDataGraph } from "@/lib/structured-data";
import { BrutalNav, BrutalFooter } from "@/components/brutalist";
import DeferredPublicWidgets from "@/components/deferred-public-widgets";
import TopLoader from "@/components/top-loader";
import PageTransition from "@/components/page-transition";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import ToastProvider from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";

const geistSans = localFont({
  src: "../fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

/** ISR: marketing subtree; admin/client opt out via their own layouts. */
export const revalidate = 3600;

const structuredData = buildStructuredDataGraph();

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const base = new URL(siteUrl);

  const titleDefault =
    locale === "ko"
      ? "THINKAD | 싱커드 - 한국 OOH 광고 에이전시"
      : "THINKAD | Korea OOH Advertising Agency";
  const description =
    locale === "ko"
      ? "대한민국 No.1 OOH 광고 에이전시. 전국 500+ 검증된 옥외광고 매체 검색, 데이터 기반 캠페인 컨설팅, 계약~사후관리 원스톱 서비스."
      : "Korea's leading OOH agency. Search 500+ verified OOH media nationwide, data-driven campaign consulting, and end-to-end execution.";

  return {
    title: {
      default: titleDefault,
      template: "%s | THINKAD",
    },
    description,
    metadataBase: base,
    keywords: [
      "OOH 광고",
      "옥외광고",
      "빌보드 광고",
      "디지털 사이니지",
      "전광판 광고",
      "교통 광고",
      "광고 에이전시",
      "싱커드",
      "THINKAD",
      "코엑스 전광판",
      "강남 광고",
    ],
    authors: [{ name: "THINKAD 싱커드", url: siteUrl }],
    creator: "THINKAD 싱커드",
    publisher: "THINKAD 싱커드",
    formatDetection: { telephone: true, email: true, address: true },
    alternates: pageAlternates(locale, ""),
    robots: { index: true, follow: true },
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
      "naver-site-verification": "",
      "google-site-verification": "",
      "theme-color": "#0D1B2E",
      "msapplication-TileColor": "#0D1B2E",
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
  const t = await getTranslations();

  /**
   * 브루탈리스트 Phase 3 — 전면 교체.
   * 기존 그룹형 nav 를 평면 6개 링크 + 우측 CTA 로 단순화.
   * 라벨은 next-intl 키 그대로 사용해 i18n 유지.
   */
  const brutalNavLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    { href: "/media", label: t("nav.media") },
    { href: "/planner", label: t("nav.planner") },
    { href: "/cases", label: t("nav.cases") },
    { href: "/insights", label: t("nav.insights") },
  ];

  /** Footer v2 — 첫 컬럼은 자동 로고+설명, 나머지 3개를 columns 로 전달 */
  const brutalFooterColumns = [
    {
      title: "Service",
      items: [
        { label: t("footer.domesticOOH"), href: "/media" },
        { label: t("footer.crossBorderOOH"), href: "/planner" },
        { label: t("footer.dataConsulting"), href: "/contact" },
        { label: t("footer.planningTool"), href: "/tools" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: t("nav.cases"), href: "/cases" },
        { label: t("nav.insights"), href: "/insights" },
        { label: t("nav.contact"), href: "/contact" },
        { label: t("footer.privacy"), href: "/privacy" },
      ],
    },
    {
      title: "Contact",
      items: [
        { label: "+82 02-515-2772" },
        {
          label: "mannote@tkad.co.kr",
          href: "mailto:mannote@tkad.co.kr",
          external: true,
        },
        { label: "Seoul, Republic of Korea" },
      ],
    },
  ];

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ToastProvider>
              <a href="#main-content" className="skip-link">
                {locale === "ko" ? "본문으로 건너뛰기" : "Skip to main content"}
              </a>
              <ConditionalPublicChrome>
                <TopLoader />
                <BrutalNav
                  links={brutalNavLinks}
                  cta={{ href: "/contact", label: t("nav.contact") }}
                />
              </ConditionalPublicChrome>
              <main id="main-content" className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
              <ConditionalPublicChrome>
                <BrutalFooter
                  description={t("footer.description")}
                  columns={brutalFooterColumns}
                  copyright={`© 2026 ${t("footer.companyName")}`}
                  legal={t("footer.bizNumber")}
                />
                <DeferredPublicWidgets />
              </ConditionalPublicChrome>
            </ToastProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
