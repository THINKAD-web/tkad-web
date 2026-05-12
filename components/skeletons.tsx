/**
 * 라우트 스트리밍용 스켈레톤 — 시맨틱 토큰 + 쉬머 (globals.css `.skeleton-shimmer`).
 * 히어로 스트립은 항상 `hero-void` + `text-primary` 라벨.
 */

import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer", className)} />;
}

/**
 * 페이지 상단 hero 스켈레톤 — void 배경 + 슬라이딩 액센트 막대.
 */
export function PageHeaderSkeleton() {
  return (
    <section className="relative overflow-hidden bg-hero-void py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          {`// LOADING…`}
        </p>
        <div className="mx-auto mt-6 h-9 w-64">
          <Bone className="h-full w-full" />
        </div>
        <div className="mx-auto mt-4 h-5 w-80 max-w-full">
          <Bone className="h-full w-full" />
        </div>
        <div className="mx-auto mt-8 h-1 w-48 overflow-hidden border-2 border-primary">
          <div className="h-full w-1/3 bg-primary loading-slide" />
        </div>
      </div>
    </section>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden border-2 border-border bg-card">
      <Bone className="h-40 w-full" />
      <div className="space-y-3 border-t-2 border-border p-4">
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
    <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="-mt-[2px] -ml-[2px]">
          <MediaCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function FaqItemSkeleton() {
  return (
    <div className="overflow-hidden border-2 border-border bg-card p-4 md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <Bone className="mt-0.5 h-7 w-7 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-4 w-16" />
          <Bone className="h-5 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function FaqSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="-mt-[2px]">
          <FaqItemSkeleton />
        </div>
      ))}
    </div>
  );
}

export function CaseCardSkeleton() {
  return (
    <div className="overflow-hidden border-2 border-border bg-card">
      <Bone className="h-48 w-full" />
      <div className="space-y-3 border-t-2 border-border p-5">
        <Bone className="h-5 w-20" />
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-2 border-2 border-border bg-muted p-3">
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
        </div>
        <Bone className="h-20 w-full" />
        <Bone className="h-9 w-full" />
      </div>
    </div>
  );
}

export function CaseCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="-mt-[2px] -ml-[2px]">
          <CaseCardSkeleton />
        </div>
      ))}
    </div>
  );
}
