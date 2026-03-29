import { setRequestLocale } from "next-intl/server";
import AdminQuotesListClient from "@/components/admin-quotes-list-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminQuotesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <AdminQuotesListClient />;
}
