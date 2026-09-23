import type { ReactNode } from "react";
import { SitePublicLayout } from "@/components/site-public-layout";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/** 지도 앱 라우트 — 전역 푸터 DOM 제외 (§30 SSR 불일치·스캐너 오탐 방지) */
export default async function SiteMediaMapLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <SitePublicLayout locale={locale} showSiteFooter={false}>
      {children}
    </SitePublicLayout>
  );
}
