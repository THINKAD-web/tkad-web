import { setRequestLocale } from "next-intl/server";
import AdminQuoteNewClient from "@/components/admin-quote-new-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminQuoteNewPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <AdminQuoteNewClient />;
}
