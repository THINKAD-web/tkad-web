import QuotePageClient from "./quote-page-client";
import { fetchPublicMediaCatalogCore } from "@/lib/public-media-catalog";

export const revalidate = 86400;

export default async function QuotePage() {
  const catalog = await fetchPublicMediaCatalogCore();
  return <QuotePageClient catalog={catalog} />;
}
