import { PageHeaderSkeleton } from "@/components/skeletons";

export default function PlannerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-bx-white py-12 dark:bg-bx-black">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* 단계 인디케이터 (사각) */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-12 animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30"
              />
            ))}
          </div>
          {/* 본문 카드 */}
          <div className="space-y-4 border-2 border-bx-black bg-bx-white p-6 sm:p-8 dark:border-bx-white dark:bg-bx-black">
            <div className="h-7 w-64 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
            <div className="h-4 w-96 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
            <div className="grid gap-0 pt-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="-mt-[2px] -ml-[2px] h-24 animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
