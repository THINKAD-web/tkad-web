import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CampaignAnalyticsClient } from "@/components/campaign-analytics/campaign-analytics-client";
import { fetchCampaignAnalyticsForUser } from "@/lib/campaign-analytics";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdvertiserCampaignAnalyticsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/dashboard/campaigns`);
  }

  const { id } = await params;
  const data = await fetchCampaignAnalyticsForUser(user.id, user.email, id);
  if (!data) notFound();

  return (
    <CampaignAnalyticsClient
      data={data}
      mode="advertiser"
      backHref={`/dashboard/campaigns/${id}`}
      reportPdfHref={`/api/my/dashboard/campaigns/${encodeURIComponent(id)}/report`}
    />
  );
}
