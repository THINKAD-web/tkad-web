import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import QuoteDetailClient from "./quote-detail-client";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function QuoteIdPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <QuoteDetailClient quoteId={id} />;
}
