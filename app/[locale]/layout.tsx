import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import Header from "@/components/header";
import Footer from "@/components/footer";
import QuickInquiryButton from "@/components/quick-inquiry-button";
import FloatingCta from "@/components/floating-cta";
import ExitIntentPopup from "@/components/exit-intent-popup";
import TopLoader from "@/components/top-loader";
import PageTransition from "@/components/page-transition";
import ConditionalPublicChrome from "@/components/conditional-public-chrome";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
          <ConditionalPublicChrome>
            <TopLoader />
            <Header />
          </ConditionalPublicChrome>
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <ConditionalPublicChrome>
            <Footer />
            <QuickInquiryButton />
            <FloatingCta />
            <ExitIntentPopup />
            <a
              href="https://open.kakao.com/o/placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: "#FEE500" }}
              aria-label="카카오톡 문의"
            >
              <span className="text-xl">💬</span>
            </a>
          </ConditionalPublicChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
