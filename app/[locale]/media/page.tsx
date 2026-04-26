export const dynamic = "force-dynamic";
export const revalidate = 0;

import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import BrutalMediaBrowse from "@/components/brutalist/media-browse";

export default async function MediaPage() {
  const catalog = await fetchPublicMediaCatalog();
  return <BrutalMediaBrowse catalog={catalog} />;
}
