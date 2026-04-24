import { PageHeaderSkeleton } from "@/components/skeletons";

/**
 * 루트 loading.tsx — App Router 가 새 라우트를 스트리밍 하는 동안 노출되는
 * 폴백. 텍스트 "Loading..." 로 표시하지 않고, 푸터 상단 공간을 비워두지도 않기
 * 위해 페이지 헤더·본문 레이아웃과 유사한 skeleton 을 렌더.
 *
 * 개별 라우트의 loading.tsx 가 있으면 그쪽이 우선 적용된다.
 */
export default function RootLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xl bg-slate-200/70"
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
