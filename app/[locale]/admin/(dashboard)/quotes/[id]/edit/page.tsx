import { setRequestLocale } from "next-intl/server";
import AdminQuoteNewClient from "@/components/admin-quote-new-client";
import { getFormalQuoteIssuer } from "@/lib/formal-quote-issuer";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminQuoteEditPage({ params }: Props) {
  const { id } = await params;
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return (
    <AdminQuoteNewClient
      quoteId={id}
      formalQuoteIssuer={getFormalQuoteIssuer()}
    />
  );
}
