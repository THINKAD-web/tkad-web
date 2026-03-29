import RecommendPageClient from "./recommend-page-client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 120;

export default async function RecommendPage() {
  const catalog = await fetchPublicMediaCatalog();
  return <RecommendPageClient catalog={catalog} />;
}
