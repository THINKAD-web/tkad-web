import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import MediaBrowseClient from "@/components/media-browse-client";

export const revalidate = 120;

export default async function MediaPage() {
  const catalog = await fetchPublicMediaCatalog();
  return <MediaBrowseClient catalog={catalog} />;
}
