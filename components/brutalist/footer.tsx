/**
 * BrutalFooter — 브루탈리스트 푸터.
 * 4컬럼 그리드 (모바일 1열, sm 2열, lg 4열) + 셀 사이 2px 검정 보더.
 * 하단 검정 띠에 카피라이트 (모노스페이스).
 */
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrutalFooterColumn = {
  /** [ TITLE ] 형태로 렌더되는 짧은 라벨 */
  title: string;
  items: { label: string; href?: string; external?: boolean }[];
};

export type BrutalFooterProps = {
  columns: BrutalFooterColumn[];
  /** 하단 띠 좌측 카피라이트 (기본 "© 2026 THINKAD") */
  copyright?: ReactNode;
  /** 하단 띠 우측 보조 텍스트 (예: 사업자번호 등) */
  legal?: ReactNode;
  className?: string;
};

export function BrutalFooter({
  columns,
  copyright,
  legal,
  className,
}: BrutalFooterProps) {
  return (
    <footer
      className={cn(
        "border-t-2 border-bx-black bg-bx-white",
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col, idx) => (
          <div
            key={col.title}
            className={cn(
              "border-bx-black p-6",
              // 가로 보더: 2번째부터 좌측 보더 (lg 4열), 모바일에서는 위 보더
              idx > 0 && "border-t-2 sm:border-t-0",
              idx > 0 && "sm:border-l-0 lg:border-l-2",
              // sm 2열 — 3번째 칼럼부터 위 보더
              idx >= 2 && "sm:border-t-2 lg:border-t-0",
              // sm 2열 — 짝수 인덱스가 아닌 경우 좌측 보더
              idx % 2 === 1 && "sm:border-l-2 lg:border-l-2",
            )}
          >
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bx-gray-dim">
              [ {col.title} ]
            </h3>
            <ul className="space-y-2.5">
              {col.items.map((it, i) => {
                const className =
                  "font-mono text-[12px] tracking-tight text-bx-black transition-colors hover:text-bx-accent";
                if (!it.href) {
                  return (
                    <li key={i} className={className}>
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
                        className={className}
                      >
                        {it.label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={i}>
                    <Link href={it.href} className={className}>
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-between gap-2 border-t-2 border-bx-black bg-bx-black px-6 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bx-white sm:flex-row">
        <span>{copyright ?? "© 2026 THINKAD — All rights reserved"}</span>
        {legal ? <span className="text-bx-gray">{legal}</span> : null}
      </div>
    </footer>
  );
}
