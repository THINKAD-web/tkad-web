import { PageHeaderSkeleton } from "@/components/skeletons";

export default function ContactLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-muted/40 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-11 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
