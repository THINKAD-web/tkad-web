import { PageHeaderSkeleton, MediaCardSkeletonGrid } from "@/components/skeletons";

export default function MediaLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
