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
    "대한민국 No.1 OOH 광고 에이전시. 전국 옥외광고 매체 검색 및 캠페인 컨설팅.",
  metadataBase: new URL("https://tkad.co.kr"),
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
        <NextIntlClientProvider messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
