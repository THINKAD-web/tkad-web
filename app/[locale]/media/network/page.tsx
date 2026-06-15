import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NetworkLandingClient } from "@/components/media-network/network-landing-client";
import { getNetworkMediaStats } from "@/lib/network-media-stats-query";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: raw }));
  const isKo = locale.startsWith("ko");
  return buildShareMetadata({
    title: isKo
      ? "네트워크 매체 — 전국 다지점 옥외광고 | THINKAD"
      : "Network OOH — Nationwide multi-site media | THINKAD",
    description: isKo
      ? "버스쉘터·아파트·편의점 앞 등 전국 네트워크 매체 패키지. 실시간 가격 계산기와 지도로 한눈에 확인하세요."
      : "Nationwide network packages — bus shelters, apartments, convenience fronts. Price calculator and coverage map.",
    alternates: pageAlternates("/media/network", locale),
  });
}

export default async function MediaNetworkLandingPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: raw }));
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const stats = await getNetworkMediaStats();

  return <NetworkLandingClient isKo={isKo} stats={stats} />;
}
