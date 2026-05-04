import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

export default function RecommendLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-card py-12 dark:bg-hero-void">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-full animate-pulse border-2 border-border bg-muted dark:border-hero-fg dark:bg-muted/50" />
            <div className="h-4 w-64 animate-pulse bg-muted dark:bg-muted/50" />
          </div>
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
