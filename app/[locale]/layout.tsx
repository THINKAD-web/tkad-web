import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import Header from "@/components/header";
import Footer from "@/components/footer";
import QuickInquiryButton from "@/components/quick-inquiry-button";
import KakaoChannelButton from "@/components/kakao-channel-button";
import FloatingCta from "@/components/floating-cta";
import ExitIntentPopup from "@/components/exit-intent-popup";
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

export const metadata: Metadata = {
  title: {
    default: "THINKAD | 싱커드 - 한국 OOH 광고 에이전시",
    template: "%s | THINKAD",
  },
  description:
    "대한민국 No.1 OOH 광고 에이전시. 전국 500+ 검증된 옥외광고 매체 검색, 데이터 기반 캠페인 컨설팅, 계약~사후관리 원스톱 서비스.",
  metadataBase: new URL("https://tkad.co.kr"),
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
  authors: [{ name: "THINKAD 싱커드", url: "https://tkad.co.kr" }],
  creator: "THINKAD 싱커드",
  publisher: "THINKAD 싱커드",
  formatDetection: { telephone: true, email: true, address: true },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
    siteName: "THINKAD 싱커드",
  },
  twitter: {
    card: "summary_large_image",
    site: "@thinkad_kr",
    creator: "@thinkad_kr",
  },
  other: {
    "naver-site-verification": "",
    "google-site-verification": "",
    "theme-color": "#1e3a5f",
    "msapplication-TileColor": "#1e3a5f",
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "THINKAD 싱커드",
              alternateName: "주식회사 싱커드",
              url: "https://tkad.co.kr",
              logo: "https://tkad.co.kr/pwa-icon/512",
              description:
                "대한민국 No.1 OOH 광고 에이전시. 전국 옥외광고 매체 검색 및 캠페인 컨설팅.",
              foundingDate: "2016",
              address: {
                "@type": "PostalAddress",
                addressLocality: "서울",
                addressRegion: "성동구",
                addressCountry: "KR",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                availableLanguage: ["Korean", "English"],
              },
              sameAs: ["https://open.kakao.com/o/placeholder"],
            }),
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
              <QuickInquiryButton />
              <FloatingCta />
              <ExitIntentPopup />
              <KakaoChannelButton />
            </ConditionalPublicChrome>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
