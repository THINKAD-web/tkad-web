/**
 * Admin 라우트 전용 skeleton — 관리자 페이지는 사이드바 + 콘텐츠 영역 구조라서
 * 루트 locale loading.tsx 가 맞지 않음. 콘텐츠 영역만 채운다. 브루탈리스트 톤.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="tkad-glass-surface relative overflow-hidden rounded-[22px] p-5">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {`// LOADING…`}
        </p>
        <div className="skeleton-shimmer mt-3 h-7 w-40" />
        <div className="skeleton-shimmer mt-3 h-4 w-64" />
        <div className="mt-5 h-2 w-48 overflow-hidden rounded-full border border-border/70 bg-card/60">
          <div className="h-full w-1/3 bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)] loading-slide" />
        </div>
      </div>
      <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer -mt-[2px] -ml-[2px] h-24 rounded-[22px] border border-border/70 bg-card/60"
          />
        ))}
      </div>
      <div className="skeleton-shimmer h-96 rounded-[22px] border border-border/70 bg-card/60" />
    </div>
  );
}
