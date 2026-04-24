/**
 * Admin 라우트 전용 skeleton — 관리자 페이지는 사이드바 + 콘텐츠 영역 구조라서
 * 루트 locale loading.tsx (검은 네이비 헤더) 가 맞지 않음. 콘텐츠 영역만 채운다.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-slate-200/70"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />
    </div>
  );
}
