import { PageHeaderSkeleton } from "@/components/skeletons";

export default function PlannerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* 단계 인디케이터 */}
          <div className="mb-8 flex items-center justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-12 animate-pulse rounded-full bg-slate-200"
              />
            ))}
          </div>
          {/* 본문 카드 */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="h-7 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />
            <div className="grid gap-3 pt-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-slate-200/70"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
