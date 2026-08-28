import { Suspense } from "react";
import RecommendPageClient from "./recommend-page-client";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";

export const dynamic = "force-dynamic";

export default async function RecommendPage() {
  const catalog = await fetchPublicMediaCatalogList();
  return (
    <Suspense fallback={null}>
      <RecommendPageClient catalog={catalog} />
    </Suspense>
  );
}
