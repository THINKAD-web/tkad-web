import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { DevelopersPageClient } from "@/components/developers/developers-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates, siteUrl } from "@/lib/seo";
import { DEVELOPERS_BASE_URL } from "@/lib/developers-docs-content";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "개발자 API · 싱커드 매체 연동"
    : "Developer API · Synced media";
  const description = isKo
    ? "대행사·파트너용 REST API. 매체 목록, 상세, 가용 캘린더를 API 키로 조회하세요."
    : "Partner REST API for media list, detail, and availability.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/developers"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/developers",
    }),
  };
}

export default async function DevelopersPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const base = DEVELOPERS_BASE_URL || siteUrl;
  const exampleKey = "tkad_sk_your_secret_key_here";

  return (
    <DevelopersPageClient
      isKo={isKo}
      base={base}
      exampleKey={exampleKey}
    />
  );
}
