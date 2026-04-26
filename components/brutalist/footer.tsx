/**
 * BrutalFooter v2 — 브루탈리스트 푸터 (b930b10 IA 호환).
 *
 * 4컬럼 그리드 (모바일 1열, sm 2열, lg 4열) + 셀 사이 2px 검정 보더.
 * 첫 셀: 회사 정보 (로고 + description + 보조 메타).
 * 나머지 셀: 링크 그룹 (Quick Links / Services / Contact Info 등).
 * 하단 검정 띠 카피라이트.
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
  /** 첫 셀의 회사 설명문. 있으면 첫 컬럼은 로고+설명+meta 로 자동 구성. */
  description?: ReactNode;
  /** 첫 셀에 추가로 노출할 회사 메타 (사업자등록번호 등) — description 아래 표기 */
  brandMeta?: ReactNode;
  /** description 사용 시 columns 는 3개만 (Quick Links/Services/Contact 등).
   *  description 미사용 시 columns 4개를 그대로 4컬에 매핑. */
  columns: BrutalFooterColumn[];
  /** 하단 띠 좌측 카피라이트 */
  copyright?: ReactNode;
  /** 하단 띠 우측 보조 텍스트 */
  legal?: ReactNode;
  className?: string;
};

export function BrutalFooter({
  description,
  brandMeta,
  columns,
  copyright,
  legal,
  className,
}: BrutalFooterProps) {
  // description 있으면 첫 셀은 로고+설명, 나머지 셀은 columns 그대로
  // description 없으면 columns 4개를 그대로 매핑
  const useBrandCell = Boolean(description);

  return (
    <footer
      className={cn("border-t-2 border-bx-black bg-bx-white", className)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1번 셀 — 브랜드 컬럼 또는 일반 컬럼 0번 */}
        {useBrandCell ? (
          <BrandCell
            description={description}
            brandMeta={brandMeta}
            cellIdx={0}
          />
        ) : (
          <ColumnCell col={columns[0]} cellIdx={0} />
        )}

        {/* 나머지 셀 — useBrandCell true 면 columns 0,1,2 → 셀 1,2,3 */}
        {(useBrandCell ? columns : columns.slice(1)).map((col, i) => (
          <ColumnCell
            key={col.title}
            col={col}
            cellIdx={i + 1}
          />
        ))}
      </div>
      <div className="flex flex-col items-center justify-between gap-2 border-t-2 border-bx-black bg-bx-black px-6 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bx-white sm:flex-row">
        <span>{copyright ?? "© 2026 THINKAD — All rights reserved"}</span>
        {legal ? <span className="text-bx-gray">{legal}</span> : null}
      </div>
    </footer>
  );
}

function cellBorders(idx: number): string {
  // 모바일 1열: idx>0 위 2px / sm 2열: 3번째부터 위 2px, 짝수 idx 좌측 2px
  // lg 4열: 0번 좌측보더 X, 나머지 좌측 2px, 위 보더 X
  return cn(
    "border-bx-black p-6",
    idx > 0 && "border-t-2 sm:border-t-0",
    idx > 0 && "sm:border-l-0 lg:border-l-2",
    idx >= 2 && "sm:border-t-2 lg:border-t-0",
    idx % 2 === 1 && "sm:border-l-2 lg:border-l-2",
  );
}

function BrandCell({
  description,
  brandMeta,
  cellIdx,
}: {
  description: ReactNode;
  brandMeta: ReactNode;
  cellIdx: number;
}) {
  return (
    <div className={cellBorders(cellIdx)}>
      <Link
        href="/"
        className="inline-block font-mono text-base font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent"
      >
        THINK<span className="text-bx-accent">AD</span>
      </Link>
      <div className="mt-4 max-w-xs space-y-3 font-mono text-[12px] leading-relaxed tracking-tight text-bx-black">
        <p>{description}</p>
        {brandMeta ? (
          <div className="text-[11px] text-bx-gray-dim">{brandMeta}</div>
        ) : null}
      </div>
    </div>
  );
}

function ColumnCell({
  col,
  cellIdx,
}: {
  col: BrutalFooterColumn;
  cellIdx: number;
}) {
  return (
    <div className={cellBorders(cellIdx)}>
      <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bx-gray-dim">
        [ {col.title} ]
      </h3>
      <ul className="space-y-2.5">
        {col.items.map((it, i) => {
          const cls =
            "font-mono text-[12px] tracking-tight text-bx-black transition-colors hover:text-bx-accent";
          if (!it.href) {
            return (
              <li key={i} className={cls}>
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
                  className={cls}
                >
                  {it.label}
                </a>
              </li>
            );
          }
          return (
            <li key={i}>
              <Link href={it.href} className={cls}>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
