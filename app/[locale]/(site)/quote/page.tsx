import QuotePageClient from "./quote-page-client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 86400;

export default async function QuotePage() {
  const catalog = await fetchPublicMediaCatalog();
  return <QuotePageClient catalog={catalog} />;
}
