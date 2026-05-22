import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

export default function MediaLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-card py-12 dark:bg-hero-void">
        <div className="ui-container">
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
