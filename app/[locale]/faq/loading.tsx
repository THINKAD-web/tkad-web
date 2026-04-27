import { PageHeaderSkeleton, FaqSkeletonList } from "@/components/skeletons";

export default function FaqLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-bx-white py-10 dark:bg-bx-black">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="h-11 w-full animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30" />
        </div>
      </section>
      <section className="bg-bx-white py-12 dark:bg-bx-black">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30"
              />
            ))}
          </div>
          <FaqSkeletonList count={8} />
        </div>
      </section>
    </>
  );
}
