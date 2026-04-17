import ComparePageClient from "@/components/compare-page-client";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";

type SearchParams = { ids?: string | string[] };

export const revalidate = 3600;

export default async function ComparePage({
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

  let items: MediaItem[] = [];

  if (idList.length > 0) {
    for (const id of idList) {
      const m = catalog.find((x) => x.id === id);
      if (m) items.push(m);
    }
  } else {
    // ids가 없을 때는 카탈로그 상위 12개로 기본 비교 세트를 구성합니다.
    // (이전: Math.random sort — SSR 캐시·hydration과 충돌)
    items = catalog.slice(0, 12);
  }

  return <ComparePageClient items={items} />;
}
