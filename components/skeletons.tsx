function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className ?? ""}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <section className="bg-navy py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Bone className="mx-auto h-9 w-48 !bg-white/20" />
        <Bone className="mx-auto mt-3 h-5 w-72 !bg-white/10" />
      </div>
    </section>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Bone className="h-40" />
      <div className="space-y-3 p-4">
        <Bone className="h-4 w-16" />
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-1/2" />
        <Bone className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export function MediaCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FaqItemSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <Bone className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function FaqSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FaqItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function CaseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border-0 bg-white shadow-md">
      <Bone className="h-48" />
      <div className="space-y-3 p-5">
        <Bone className="h-5 w-20 rounded-full" />
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
        </div>
        <Bone className="h-20 rounded-xl" />
        <Bone className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

export function CaseCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
