import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import QuoteStatusClient from "./quote-status-client";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function QuoteStatusPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <QuoteStatusClient quoteId={id} />;
}
