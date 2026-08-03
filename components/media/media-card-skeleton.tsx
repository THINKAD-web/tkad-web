import { DiscoveryFilterBarSkeleton } from "@/components/discovery/discovery-route-skeletons";
import { MEDIA_BROWSE_CARD_GRID_CLASS } from "@/lib/media-browse-grid";
import { cn } from "@/lib/utils";

/** `/media` 카드형(map-tile) — `DiscoveryMediaCardMapTile` 과 동일 비율·패딩 */
export function MediaCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10",
        className,
      )}
      aria-hidden
    >
      <div className="aspect-[4/3] w-full animate-pulse bg-gray-200 dark:bg-white/10" />
      <div className="space-y-2 p-2.5">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-[85%] animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-5 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export function MediaCardSkeletonGrid({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(MEDIA_BROWSE_CARD_GRID_CLASS, className)}
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-full min-h-0">
          <MediaCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** `/media` route — `loading.tsx` · Suspense fallback (앱 셸 + 필터 + 카드 그리드) */
export function MediaBrowsePageSkeleton() {
  return (
    <div
      className="tkad-media-app-shell tkad-media-list-shell relative w-full min-w-0 bg-gray-50 dark:bg-[#020202]"
      aria-busy="true"
      aria-label="Loading media browse"
    >
      <div className="min-w-0 px-4 pt-3">
        <DiscoveryFilterBarSkeleton />
      </div>
      <div className="min-w-0 px-4 pt-3 pb-[calc(4.25rem+1.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6">
        <MediaCardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
