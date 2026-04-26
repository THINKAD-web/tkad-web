/**
 * SectionHead — 12컬럼 그리드 헤더 [num 1-3 | title 3-10 | meta 10-13]
 *
 * 사용 예:
 *   <SectionHead
 *     number="01"
 *     category="Process"
 *     title={<>4단계 <span className="bx-accent">매체 검증</span></>}
 *     meta={isKo ? "현장 방문 → 실측 → 검증 → 등록" : "On-site → measurement → verify → list"}
 *   />
 *
 * - 모바일: 1컬럼 스택 (num 위, title 가운데, meta 아래)
 * - lg 이상: 12컬럼 그리드, num 3컬·title 7컬·meta 3컬, 셀 사이 + 아래 2px 보더
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeadProps = {
  number: string;
  category?: string;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function SectionHead({
  number,
  category,
  title,
  meta,
  className,
}: SectionHeadProps) {
  return (
    <header
      className={cn(
        "grid grid-cols-1 border-b-2 border-bx-black lg:grid-cols-12",
        className,
      )}
    >
      {/* num — lg cols 1-3 */}
      <div className="border-b-2 border-bx-black px-4 py-5 sm:px-6 lg:col-span-3 lg:border-b-0 lg:border-r-2 lg:px-8 lg:py-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-bx-black">
          [{number}]
          {category ? (
            <span className="ml-2 text-bx-gray-dim"> / {category}</span>
          ) : null}
        </p>
      </div>

      {/* title — lg cols 4-10 (7컬) */}
      <div className="border-b-2 border-bx-black px-4 py-8 sm:px-6 sm:py-10 lg:col-span-7 lg:border-b-0 lg:border-r-2 lg:px-10 lg:py-14">
        <h2 className="font-bold leading-[0.96] tracking-[-0.02em] text-bx-black text-[clamp(2.5rem,5vw,5rem)]">
          {title}
        </h2>
      </div>

      {/* meta — lg cols 11-13 (3컬), 우측 정렬 */}
      <div className="px-4 py-5 sm:px-6 lg:col-span-2 lg:px-8 lg:py-10">
        {meta ? (
          <p className="whitespace-pre-line font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-bx-gray-dim lg:text-right">
            {meta}
          </p>
        ) : null}
      </div>
    </header>
  );
}
