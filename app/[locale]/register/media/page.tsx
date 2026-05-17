import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MediaRegisterPageClient } from "@/components/media-application/media-register-page-client";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "매체 등록 신청 | THINKAD"
      : "Register your media | THINKAD",
    description: isKo
      ? "매체사 셀프 등록 신청 — 싱커드 심사 후 카탈로그에 노출됩니다."
      : "Submit your OOH media for THINKAD review and catalog listing.",
    alternates: pageAlternates(locale, "/register/media"),
    robots: { index: true, follow: true },
  };
}

export default async function MediaRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return <MediaRegisterPageClient isKo={isKo} />;
}
