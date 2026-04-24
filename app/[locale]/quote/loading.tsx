import { PageHeaderSkeleton } from "@/components/skeletons";

export default function QuoteLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* 스텝 인디케이터 */}
          <div className="mb-8 flex items-center justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-16 animate-pulse rounded-full bg-slate-200"
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl bg-slate-200/70"
                  />
                ))}
              </div>
            </div>
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
          </div>
        </div>
      </section>
    </>
  );
}
