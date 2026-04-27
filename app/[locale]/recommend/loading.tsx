import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

export default function RecommendLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-bx-white py-12 dark:bg-bx-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-full animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30" />
            <div className="h-4 w-64 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
          </div>
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
