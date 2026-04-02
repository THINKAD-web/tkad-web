import { fetchMediaBrowseCatalog } from "@/lib/media-browse-catalog";
import MediaBrowseClient from "@/components/media-browse-client";

export const revalidate = 3600;

/** `/media` 카탈로그는 DB 없이 `lib/media-browse-catalog` 목업만 사용합니다. */
export default async function MediaPage() {
  const catalog = await fetchMediaBrowseCatalog();
  return <MediaBrowseClient catalog={catalog} />;
}
