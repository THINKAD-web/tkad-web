import { cn } from "@/lib/utils";

function DiscoveryBone({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-xl bg-muted", className)}
      aria-hidden
    />
  );
}

/** `/media`·`/media/map` — 상단 필터/검색 바 자리 */
export function DiscoveryFilterBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <DiscoveryBone className="h-10 min-w-[12rem] flex-1 rounded-2xl" />
        <DiscoveryBone className="h-10 w-20 shrink-0 rounded-xl" />
        <DiscoveryBone className="h-10 w-24 shrink-0 rounded-xl" />
        <DiscoveryBone className="hidden h-10 w-28 shrink-0 rounded-xl sm:block" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <DiscoveryBone key={i} className="h-8 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <DiscoveryBone className="h-4 w-40 rounded-lg" />
    </div>
  );
}

/** `DiscoveryMediaCard` feed variant */
export function DiscoveryMediaFeedCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
      aria-hidden
    >
      <div className="flex min-w-0 items-stretch gap-3 p-3 sm:gap-4 sm:p-3.5">
        <DiscoveryBone className="aspect-[4/3] h-full min-h-[6.5rem] w-[38%] min-w-[7.25rem] max-w-[11rem] shrink-0 rounded-xl sm:min-w-[8rem] sm:max-w-[12rem]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <DiscoveryBone className="h-3 w-24" />
          <DiscoveryBone className="h-5 w-4/5" />
          <DiscoveryBone className="h-4 w-2/5" />
          <div className="mt-auto space-y-1.5 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              <DiscoveryBone className="h-8 rounded-lg" />
              <DiscoveryBone className="h-8 rounded-lg" />
            </div>
            <div className="flex gap-1">
              <DiscoveryBone className="h-7 flex-1 rounded-lg" />
              <DiscoveryBone className="h-7 flex-1 rounded-lg" />
              <DiscoveryBone className="h-7 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiscoveryMediaFeedSkeletonList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <DiscoveryMediaFeedCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** `DiscoveryMediaCard` map-tile variant */
export function DiscoveryMapTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
      aria-hidden
    >
      <DiscoveryBone className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-2.5">
        <DiscoveryBone className="h-4 w-4/5" />
        <DiscoveryBone className="h-3 w-2/3" />
        <DiscoveryBone className="h-4 w-1/2" />
        <DiscoveryBone className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function DiscoveryMapTileSkeletonGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="list-none">
          <DiscoveryMapTileSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** `/media` 목록 앱 셸 — loading.tsx 용 (문서 스크롤) */
export function MediaBrowseRouteSkeleton() {
  return (
    <div
      className="tkad-media-app-shell tkad-media-list-shell relative w-full min-w-0 bg-background"
      aria-busy
      aria-label="Loading media browse"
    >
      <div className="px-4 pt-3">
        <DiscoveryFilterBarSkeleton />
      </div>
      <div className="px-4 pt-3 pb-6">
        <DiscoveryMediaFeedSkeletonList count={4} />
      </div>
    </div>
  );
}

/** `/media/map` 고정 앱 셸 — loading.tsx 용 */
export function MediaMapRouteSkeleton() {
  return (
    <div
      className="tkad-media-app-shell relative w-full min-w-0 bg-background"
      aria-busy
      aria-label="Loading media map"
    >
      <div className="flex-none border-b border-border bg-background/95 px-3 pt-2 pb-2 backdrop-blur md:px-4">
        <DiscoveryFilterBarSkeleton />
      </div>
      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-[440px] shrink-0 overflow-y-auto border-r border-border bg-background lg:flex lg:w-[520px]">
          <DiscoveryMapTileSkeletonGrid count={6} className="w-full" />
        </aside>
        <div className="relative min-h-0 flex-1">
          <DiscoveryBone className="absolute inset-0 rounded-none" />
        </div>
      </div>
    </div>
  );
}

/** `/media/[slug]` 상세 — 갤러리·헤더·지표·탭 패널 */
export function MediaDetailRouteSkeleton() {
  return (
    <div
      className="bg-background pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-16"
      aria-busy
      aria-label="Loading media detail"
    >
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <DiscoveryBone className="mb-5 hidden h-9 w-28 rounded-xl md:block" />
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
          <DiscoveryBone className="aspect-[4/3] w-full rounded-2xl lg:aspect-[16/10]" />
          <div className="min-w-0 space-y-5">
            <DiscoveryBone className="h-3 w-20" />
            <DiscoveryBone className="h-9 w-4/5" />
            <div className="flex gap-1.5">
              <DiscoveryBone className="h-5 w-14 rounded-full" />
              <DiscoveryBone className="h-5 w-16 rounded-full" />
            </div>
            <DiscoveryBone className="h-4 w-3/5" />
            <DiscoveryBone className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-2">
              <DiscoveryBone className="h-14 rounded-xl" />
              <DiscoveryBone className="h-14 rounded-xl" />
              <DiscoveryBone className="h-14 rounded-xl" />
            </div>
            <DiscoveryBone className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <DiscoveryBone key={i} className="h-9 w-20 shrink-0 rounded-xl" />
          ))}
        </div>
        <DiscoveryBone className="mt-6 min-h-[24rem] w-full rounded-2xl" />
      </div>
    </div>
  );
}
