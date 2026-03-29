import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "servicesPage" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const ogTitle =
    locale === "ko"
      ? `${title} | THINKAD 싱커드`
      : `${title} | THINKAD`;
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/services"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "services",
        ogAltForRoute("services"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
