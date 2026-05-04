/**
 * Admin 라우트 전용 skeleton — 관리자 페이지는 사이드바 + 콘텐츠 영역 구조라서
 * 루트 locale loading.tsx 가 맞지 않음. 콘텐츠 영역만 채운다. 브루탈리스트 톤.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="border-2 border-border bg-card p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {`// LOADING…`}
        </p>
        <div className="skeleton-shimmer mt-3 h-7 w-40" />
        <div className="skeleton-shimmer mt-3 h-4 w-64" />
        {/* 좌→우 슬라이딩 주황 진행 막대 */}
        <div className="mt-5 h-1 w-48 overflow-hidden border-2 border-primary">
          <div className="h-full w-1/3 bg-primary loading-slide" />
        </div>
      </div>
      <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer -mt-[2px] -ml-[2px] h-24 border-2 border-border"
          />
        ))}
      </div>
      <div className="skeleton-shimmer h-96 border-2 border-border" />
    </div>
  );
}
