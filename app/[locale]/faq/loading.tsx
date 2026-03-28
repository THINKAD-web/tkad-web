import { PageHeaderSkeleton, FaqSkeletonList } from "@/components/skeletons";

export default function FaqLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="border-b border-navy/10 bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="h-11 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </section>
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
          <FaqSkeletonList count={8} />
        </div>
      </section>
    </>
  );
}
