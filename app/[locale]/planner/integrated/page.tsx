import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import IntegratedPlannerPageClient from "./integrated-planner-page-client";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plannerIntegrated" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
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
