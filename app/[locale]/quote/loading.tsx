import { PageHeaderSkeleton } from "@/components/skeletons";

export default function QuoteLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-card py-12 dark:bg-hero-void">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* 스텝 인디케이터 (사각) */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-2 w-16 animate-pulse border-2 border-border bg-muted dark:border-hero-fg dark:bg-muted/50"
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4 border-2 border-border bg-card p-6 dark:border-hero-fg dark:bg-hero-void">
              <div className="h-6 w-48 animate-pulse bg-muted dark:bg-muted/50" />
              <div className="grid gap-0 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="-mt-[2px] -ml-[2px] h-28 animate-pulse border-2 border-border bg-muted dark:border-hero-fg dark:bg-muted/50"
                  />
                ))}
              </div>
            </div>
            <div className="h-64 animate-pulse border-2 border-border bg-muted dark:border-hero-fg dark:bg-muted/50" />
          </div>
        </div>
      </section>
    </>
  );
}
