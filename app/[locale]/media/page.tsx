export const dynamic = "force-dynamic";
export const revalidate = 0;

import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import MediaBrowseClient from "@/components/media-browse-client";

export const revalidate = 3600;

export default async function MediaPage() {
  const catalog = await fetchPublicMediaCatalog();
  return <MediaBrowseClient catalog={catalog} />;
}