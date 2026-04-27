/**
 * Admin 라우트 전용 skeleton — 관리자 페이지는 사이드바 + 콘텐츠 영역 구조라서
 * 루트 locale loading.tsx 가 맞지 않음. 콘텐츠 영역만 채운다. 브루탈리스트 톤.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="border-2 border-bx-black bg-bx-white p-5 dark:border-bx-white dark:bg-bx-black">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          {`// LOADING…`}
        </p>
        <div className="mt-3 h-7 w-40 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
        <div className="mt-3 h-4 w-64 animate-pulse bg-bx-off dark:bg-bx-gray-dim/30" />
        {/* 좌→우 슬라이딩 주황 진행 막대 */}
        <div className="mt-5 h-1 w-48 overflow-hidden border-2 border-bx-accent">
          <div className="h-full w-1/3 bg-bx-accent loading-slide" />
        </div>
      </div>
      <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="-mt-[2px] -ml-[2px] h-24 animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse border-2 border-bx-black bg-bx-off dark:border-bx-white dark:bg-bx-gray-dim/30" />
    </div>
  );
}
