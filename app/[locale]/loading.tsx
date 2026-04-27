import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

/**
 * 루트 loading.tsx — App Router 가 새 라우트를 스트리밍 하는 동안 노출되는
 * 폴백. 브루탈리스트 톤 (검정 hero + 모노 [LOADING…] 라벨 + 주황 슬라이딩
 * 진행 막대). 다크모드 자동 대응 (skeletons.tsx 의 dark: 변형 사용).
 *
 * 개별 라우트의 loading.tsx 가 있으면 그쪽이 우선 적용된다.
 */
export default function RootLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-bx-white py-12 dark:bg-bx-black">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-32 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
          <div className="h-8 w-2/3 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
          <MediaCardSkeletonGrid count={3} />
        </div>
      </section>
    </>
  );
}
