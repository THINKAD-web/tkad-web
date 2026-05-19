import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CampaignAnalyticsClient } from "@/components/campaign-analytics/campaign-analytics-client";
import { fetchCampaignAnalyticsById } from "@/lib/campaign-analytics";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminCampaignAnalyticsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const { id } = await params;
  const data = await fetchCampaignAnalyticsById(id);
  if (!data) notFound();

  return (
    <CampaignAnalyticsClient
      data={data}
      mode="admin"
      backHref={`/admin/campaigns`}
      reportPdfHref={`/api/admin/campaigns/${encodeURIComponent(id)}/completion-report`}
    />
  );
}
