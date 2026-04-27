/**
 * 브루탈리스트 로딩 스켈레톤.
 *
 * 톤: 사각 보더 + 사각 모서리 (radius 0) + bx-off 회색 펄스.
 * 헤더는 검정 배경 + bx-accent 모노 라벨 + 좌→우 슬라이딩 주황 막대 진행 인디케이터.
 *
 * 다크모드 변형: dark: prefix + .dark 셀렉터 토큰 (#공통-2 에서 정의).
 */

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bx-off dark:bg-bx-gray-dim/30 ${className ?? ""}`}
    />
  );
}

/**
 * 페이지 상단 hero 스켈레톤. 검정 배경 + 모노 [LOADING…] 라벨 +
 * 좌→우 무한 슬라이딩 주황 막대 (사용자가 "로딩 중" 임을 즉시 인지).
 */
export function PageHeaderSkeleton() {
  return (
    <section className="relative overflow-hidden bg-bx-black py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          {`// LOADING…`}
        </p>
        <div className="mx-auto mt-6 h-9 w-64 animate-pulse bg-bx-white/15" />
        <div className="mx-auto mt-4 h-5 w-80 animate-pulse bg-bx-white/10" />
        {/* 좌→우 슬라이딩 주황 진행 막대 */}
        <div className="mx-auto mt-8 h-1 w-48 overflow-hidden border-2 border-bx-accent">
          <div className="h-full w-1/3 bg-bx-accent loading-slide" />
        </div>
      </div>
    </section>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden border-2 border-bx-black bg-bx-white dark:border-bx-white dark:bg-bx-black">
      <Bone className="h-40" />
      <div className="space-y-3 border-t-2 border-bx-black p-4 dark:border-bx-white">
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
    <div className="overflow-hidden border-2 border-bx-black bg-bx-white p-4 md:p-5 dark:border-bx-white dark:bg-bx-black">
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
    <div className="overflow-hidden border-2 border-bx-black bg-bx-white dark:border-bx-white dark:bg-bx-black">
      <Bone className="h-48" />
      <div className="space-y-3 border-t-2 border-bx-black p-5 dark:border-bx-white">
        <Bone className="h-5 w-20" />
        <Bone className="h-5 w-3/4" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-2 border-2 border-bx-black bg-bx-off p-3 dark:border-bx-white dark:bg-bx-black">
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
          <Bone className="mx-auto h-8 w-12" />
        </div>
        <Bone className="h-20" />
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
