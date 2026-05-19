import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "OOH 광고 패키지 | THINKAD 싱커드"
    : "OOH advertising packages | THINKAD";
  const description = isKo
    ? "강남 프리미엄, 성수 감성, K-콘텐츠 팬덤 등 목적별 큐레이션 패키지로 간편하게 시작하세요."
    : "Start fast with curated OOH packages—Gangnam premium, Seongsu lifestyle, K-content fandom, and more.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/packages"),
  };
}

/** `/packages` → `/media/packages` (canonical) */
export default async function PackagesRedirectPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/media/packages", locale });
}
