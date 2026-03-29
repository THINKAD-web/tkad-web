import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import MediaBrowseClient from "@/components/media-browse-client";

export const revalidate = 120;

/**
 * 공개 카탈로그(DB 우선, 비어 있으면 샘플) — 매체 목록·검색·AI 추천 탭이 동일 데이터를 사용합니다.
 */
export default async function MediaPage() {
  const catalog = await fetchPublicMediaCatalog();
  return <MediaBrowseClient catalog={catalog} />;
}
