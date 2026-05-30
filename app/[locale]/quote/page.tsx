import QuotePageClient from "./quote-page-client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const catalog = await fetchPublicMediaCatalog();
  return <QuotePageClient catalog={catalog} />;
}
