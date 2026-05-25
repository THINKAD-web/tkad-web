import { MediaSearchPage } from "@/components/media/media-search-page";
import { fetchPublicMediaCatalog } from "@/lib/media-catalog";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function MediaPage({ searchParams }: Props) {
  const sp = await searchParams;

  const initialMedia = await fetchPublicMediaCatalog({
    sort: "popular",
    limit: 20,
    category: sp.category,
    target: sp.target,
    region: sp.region,
  }).catch(() => []);

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <p className="text-xs dark:text-cyan-400/60 text-cyan-600/60 tracking-widest uppercase mb-2">
          // 01 · MEDIA
        </p>
        <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">
          전국{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            OOH 매체
          </span>{" "}
          검색
        </h1>
        <p className="text-sm dark:text-white/50 text-gray-500">
          500+ 검증 매체를 유형·지역·목적별로 탐색하세요
        </p>
      </div>
      <MediaSearchPage
        initialMedia={initialMedia}
        initialCategory={sp.category}
        initialTarget={sp.target}
        initialRegion={sp.region}
      />
    </>
  );
}
