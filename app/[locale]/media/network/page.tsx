import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { pageAlternates } from "@/lib/seo";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

/** 목록 canonical — `/media` 계열 (쿼리 `features=network`) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return {
    alternates: pageAlternates(locale, "/media"),
    robots: { index: false, follow: true },
  };
}

/**
 * `/media/network` 목록 — `/media?features=network` 로 영구 리다이렉트.
 * `/media/network/[id]` 상세는 이 라우트와 무관하게 유지된다.
 */
export default async function MediaNetworkCatalogRedirect({
  params,
  searchParams,
}: Props) {
  const locale = await resolveLocaleParam(params);
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set("features", "network");
  for (const key of [
    "networkType",
    "regionMain",
    "regionSub",
    "q",
    "sort",
    "priceMin",
    "priceMax",
  ] as const) {
    const value = sp[key];
    if (value) qs.set(key, value);
  }
  permanentRedirect(`/${locale}/media?${qs.toString()}`);
}
