import ComparePageClient from "@/components/compare-page-client";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";

type SearchParams = { ids?: string | string[] };

export const revalidate = 300;

export default async function MediaComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const raw = sp.ids;
  const idsParam = Array.isArray(raw) ? raw[0] : raw ?? "";
  const catalog = await fetchPublicMediaCatalog();
  const idList = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, COMPARE_MAX_ITEMS);

  const items: MediaItem[] = [];
  if (idList.length > 0) {
    for (const id of idList) {
      const m = catalog.find((x) => x.id === id);
      if (m) items.push(m);
    }
  }

  return <ComparePageClient items={items} />;
}
