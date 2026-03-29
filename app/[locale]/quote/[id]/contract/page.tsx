import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import ContractSignClient from "./contract-sign-client";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function QuoteContractPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <ContractSignClient quoteId={id} />;
}
