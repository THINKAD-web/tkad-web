/**
 * BrutalFooter v2
 *
 * - 상단 2px 검정 보더 + 흰 배경
 * - 4컬럼 그리드: [로고+설명 | Service | Company | Contact]
 * - 컬럼 사이 2px 검정 보더, 컬럼 내부 padding 48px 32px (lg)
 * - 컬럼 헤더: 모노 11px, 대문자, 헤더 아래 2px 검정 보더
 * - 링크: 모노 14px, hover 주황
 * - 푸터 하단: 카피라이트 + 주소 (모노 11px, 양쪽 정렬, 위에 2px 보더)
 * - 모바일: 4컬럼 → sm 2컬럼 → 1컬럼 (자동 그리드 wrap)
 */
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrutalFooterColumn = {
  /** 컬럼 헤더 라벨 (예: "Service" → 렌더 시 [ SERVICE ]) */
  title: string;
  items: { label: string; href?: string; external?: boolean }[];
};

export type BrutalFooterProps = {
  /** 좌측 로고 컬럼의 회사 설명 (1~2줄) */
  description?: ReactNode;
  /** Service / Company / Contact 등 4개 권장 (3개도 가능) */
  columns: BrutalFooterColumn[];
  /** 하단 좌측 카피라이트 */
  copyright?: ReactNode;
  /** 하단 우측 주소·법적 텍스트 */
  legal?: ReactNode;
  className?: string;
};

function LogoMark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center bg-bx-black"
    >
      <span className="block h-2.5 w-2.5 border-2 border-bx-black bg-bx-white" />
    </span>
  );
}

export function BrutalFooter({
  description,
  columns,
  copyright,
  legal,
  className,
}: BrutalFooterProps) {
  const allCols = [
    {
      type: "logo" as const,
    },
    ...columns.map((c) => ({ type: "data" as const, ...c })),
  ];

  return (
    <footer
      className={cn("border-t-2 border-bx-black bg-bx-white", className)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {allCols.map((col, idx) => (
          <div
            key={idx}
            className={cn(
              "border-bx-black px-6 py-10 sm:px-8 lg:px-8 lg:py-12",
              // 모바일/sm 보더: 첫 번째 셀 위에는 보더 없음
              idx > 0 && "border-t-2 sm:border-t-0",
              // sm 2컬: 짝수 인덱스(0, 2)는 우측 보더
              idx % 2 === 0 && "sm:border-r-2",
              // sm 2컬: 3번째부터(2,3) 위 보더 (lg 에서는 제거)
              idx >= 2 && "sm:border-t-2 lg:border-t-0",
              // lg 4컬: 모든 셀 좌측 보더 (마지막 셀에 우측 보더 없음 처리)
              "lg:border-l-2 lg:border-r-0",
              idx === 0 && "lg:border-l-0",
            )}
          >
            {col.type === "logo" ? (
              <div>
                <Link
                  href="/"
                  className="flex items-center gap-3 transition-colors hover:text-bx-accent"
                >
                  <LogoMark />
                  <span className="text-[18px] font-extrabold uppercase leading-none tracking-tight text-bx-black">
                    THINK<span className="text-bx-accent">AD</span>
                  </span>
                </Link>
                {description ? (
                  <p className="mt-5 max-w-xs text-sm leading-relaxed text-bx-gray-dim">
                    {description}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <h3 className="border-b-2 border-bx-black pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black">
                  [ {col.title} ]
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.items.map((it, i) => {
                    const linkClass =
                      "font-mono text-[14px] tracking-tight text-bx-black transition-colors hover:text-bx-accent";
                    if (!it.href) {
                      return (
                        <li
                          key={i}
                          className="font-mono text-[14px] tracking-tight text-bx-gray-dim"
                        >
                          {it.label}
                        </li>
                      );
                    }
                    if (it.external) {
                      return (
                        <li key={i}>
                          <a
                            href={it.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                          >
                            {it.label}
                          </a>
                        </li>
                      );
                    }
                    return (
                      <li key={i}>
                        <Link href={it.href} className={linkClass}>
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 띠 — 양쪽 정렬, 위 2px 보더 (검정 배경 X) */}
      <div className="flex flex-col items-start justify-between gap-2 border-t-2 border-bx-black px-6 py-5 sm:flex-row sm:items-center sm:px-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black">
          {copyright ?? "© 2026 THINKAD — All rights reserved"}
        </span>
        {legal ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            {legal}
          </span>
        ) : null}
      </div>
    </footer>
  );
}
