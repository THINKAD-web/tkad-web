import { PageHeaderSkeleton, CaseCardSkeletonGrid } from "@/components/skeletons";

export default function CasesLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
          <CaseCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
