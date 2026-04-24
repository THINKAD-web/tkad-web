import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

export default function RecommendLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
          </div>
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
