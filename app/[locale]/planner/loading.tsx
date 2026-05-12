import { PageHeaderSkeleton } from "@/components/skeletons";

export default function PlannerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-background py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* 단계 인디케이터 (사각) */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-12 animate-pulse border-2 border-border bg-muted"
              />
            ))}
          </div>
          {/* 본문 카드 */}
          <div className="space-y-4 border-2 border-border bg-card p-6 sm:p-8">
            <div className="h-7 w-64 animate-pulse bg-muted" />
            <div className="h-4 w-96 animate-pulse bg-muted" />
            <div className="grid gap-0 pt-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="-mt-[2px] -ml-[2px] h-24 animate-pulse border-2 border-border bg-muted"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
