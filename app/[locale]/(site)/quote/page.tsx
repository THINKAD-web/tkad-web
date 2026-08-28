import QuotePageClient from "./quote-page-client";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";

export const revalidate = 86400;

export default async function QuotePage() {
  const catalog = await fetchPublicMediaCatalogList();
  return <QuotePageClient catalog={catalog} />;
}
