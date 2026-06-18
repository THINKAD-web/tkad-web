import { setRequestLocale } from "next-intl/server";
import { MySavedPlansPageClient } from "@/components/my/my-saved-plans-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export default async function MySavedPlansPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <MySavedPlansPageClient />;
}
