import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { routing } from "@/i18n/routing";
import { defaultOgImages, siteUrl } from "@/lib/seo";
import Header from "@/components/header";
import Footer from "@/components/footer";
import DeferredPublicWidgets from "@/components/deferred-public-widgets";
import TopLoader from "@/components/top-loader";
import PageTransition from "@/components/page-transition";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import ToastProvider from "@/components/toast-provider";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** ISR: marketing subtree; admin/client opt out via their own layouts. */
export const revalidate = 3600;

const ORG_ID = `${siteUrl}/#organization`;
const LOCAL_ID = `${siteUrl}/#localbusiness`;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "THINKAD 싱커드",
      alternateName: ["THINKAD", "주식회사 싱커드"],
      url: siteUrl,
      logo: `${siteUrl}/pwa-icon/512`,
      description:
        "대한민국 No.1 OOH 광고 에이전시. 전국 옥외광고 매체 검색 및 캠페인 컨설팅.",
      foundingDate: "2016",
      sameAs: ["https://open.kakao.com/o/placeholder"],
    },
    {
      "@type": "LocalBusiness",
      "@id": LOCAL_ID,
      parentOrganization: { "@id": ORG_ID },
      name: "THINKAD 싱커드",
      image: `${siteUrl}/pwa-icon/512`,
      url: siteUrl,
      telephone: "+82-2-515-2772",
      address: {
        "@type": "PostalAddress",
        streetAddress:
          "뚝섬로17가길 48 성수에이원지식산업센터 1102호",
        addressLocality: "성동구",
        addressRegion: "서울특별시",
        addressCountry: "KR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 37.5446,
        longitude: 127.0557,
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      priceRange: "$$",
    },
  ],
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
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
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ko: `${base.origin}/ko`,
        en: `${base.origin}/en`,
        "x-default": `${base.origin}/ko`,
      },
    },
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
      "theme-color": "#1A2A6C",
      "msapplication-TileColor": "#1A2A6C",
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <a href="#main-content" className="skip-link">
              {locale === "ko" ? "본문으로 건너뛰기" : "Skip to main content"}
            </a>
            <ConditionalPublicChrome>
              <TopLoader />
              <Header />
            </ConditionalPublicChrome>
            <main id="main-content" className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <ConditionalPublicChrome>
              <Footer />
              <DeferredPublicWidgets />
            </ConditionalPublicChrome>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
