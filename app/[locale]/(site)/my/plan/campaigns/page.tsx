import { setRequestLocale } from "next-intl/server";
import { MyCampaignPlansPageClient } from "@/components/my/my-campaign-plans-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export default async function MyCampaignPlansPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <MyCampaignPlansPageClient />;
}
