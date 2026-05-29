import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import IntegratedPlannerPageClient from "./integrated-planner-page-client";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "plannerIntegrated" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/planner/integrated"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/planner/integrated",
      image: { kind: "segment", segment: "planner" },
    }),
  };
}

export default async function IntegratedPlannerPage() {
  const { catalog, databaseEmpty } = await fetchPlannerMediaCatalog();
  return (
    <Suspense fallback={null}>
      <IntegratedPlannerPageClient
        catalog={catalog}
        databaseEmpty={databaseEmpty}
      />
    </Suspense>
  );
}
