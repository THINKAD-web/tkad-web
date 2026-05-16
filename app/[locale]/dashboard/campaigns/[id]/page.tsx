import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdvertiserCampaignDetailClient } from "@/components/advertiser-dashboard/campaign-detail-client";
import { fetchAdvertiserCampaignDetail } from "@/lib/advertiser-dashboard-queries";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdvertiserCampaignDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/dashboard`);
  }

  const { id } = await params;
  const detail = await fetchAdvertiserCampaignDetail(user.id, user.email, id);
  if (!detail) notFound();

  return <AdvertiserCampaignDetailClient initial={detail} />;
}
