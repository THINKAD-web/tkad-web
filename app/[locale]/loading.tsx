import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

/**
 * Locale 루트 loading.tsx — App Router 스트리밍 폴백.
 * 개별 라우트에 loading.tsx 가 있으면 그쪽이 우선.
 */
export default function RootLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-background py-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="skeleton-shimmer h-4 w-32" />
          <div className="skeleton-shimmer h-8 w-full max-w-xl" />
          <MediaCardSkeletonGrid count={3} />
        </div>
      </section>
    </>
  );
}
