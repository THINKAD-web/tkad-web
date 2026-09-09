import { Suspense } from "react";
import AdminReportsHubClient from "@/components/admin/admin-reports-hub-client";
import type { CampaignBuilderCatalogProps } from "@/components/admin/campaign-builder/campaign-builder-track";
import { loadOohCatalogItems } from "@/lib/admin-campaign-builder/ooh-catalog";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import {
  parseAdminReportHubStep,
  parseAdminReportHubType,
} from "@/lib/admin-reports-hub";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminReportsHubPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawType = typeof sp.type === "string" ? sp.type : null;
  const rawStep = typeof sp.step === "string" ? sp.step : null;
  const type = parseAdminReportHubType(rawType);
  const step = parseAdminReportHubStep(rawStep);

  let builderCatalog: CampaignBuilderCatalogProps | null = null;

  if (type === "builder" && step >= 2) {
    const [digital, oohItems] = await Promise.all([
      fetchLocalDigitalCatalog(),
      loadOohCatalogItems(),
    ]);
    builderCatalog = {
      digitalViews: digital.ok ? digital.views : [],
      oohItems,
    };
  }

  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>
      }
    >
      <AdminReportsHubClient builderCatalog={builderCatalog} />
    </Suspense>
  );
}
