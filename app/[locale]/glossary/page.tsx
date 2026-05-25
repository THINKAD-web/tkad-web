import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { GlossaryPageClient } from "@/components/glossary/glossary-page-client";

type Props = { params: Promise<{ locale: string }> };

export default async function GlossaryPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <GlossaryPageClient />;
}
