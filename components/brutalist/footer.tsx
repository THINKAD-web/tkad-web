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
      id="site-footer"
      className={cn(
        "tkad-site-footer relative shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 hidden dark:block tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 hidden opacity-15 dark:block tkad-neon-grid" />
      <div aria-hidden className="absolute inset-0 hidden tkad-hero-noise opacity-[0.06] mix-blend-overlay dark:block" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1번 셀 — 브랜드 컬럼 또는 일반 컬럼 0번 */}
        {useBrandCell ? (
          <BrandCell
            description={description}
            brandMeta={brandMeta}
          />
        ) : (
          <ColumnCell col={columns[0]} />
        )}

        {/* 나머지 셀 — useBrandCell true 면 columns 0,1,2 → 셀 1,2,3 */}
        {(useBrandCell ? columns : columns.slice(1)).map((col) => (
          <ColumnCell
            key={col.title}
            col={col}
          />
        ))}
        </div>
      </div>

      <div className="relative border-t border-gray-200 bg-white/80 px-6 py-5 text-center font-display text-xs font-medium uppercase tracking-[0.22em] text-gray-500 backdrop-blur dark:border-gray-800 dark:bg-black/40 dark:text-white/60">
        <span>
          {copyright ??
            `© ${new Date().getFullYear()} THINKAD — All rights reserved`}
        </span>
        {legal ? <span className="ml-4 text-gray-400 dark:text-white/50">{legal}</span> : null}
      </div>
    </footer>
  );
}

function BrandCell({
  description,
  brandMeta,
}: {
  description: ReactNode;
  brandMeta: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-white p-8 shadow-lg ring-1 ring-gray-200/80 dark:bg-white/5 dark:shadow-[0_30px_120px_rgba(0,0,0,0.78)] dark:ring-white/10 tkad-neon-border">
      <Link
        href="/"
        className="inline-block font-display text-[12px] font-black uppercase tracking-[0.22em] text-gray-900 dark:text-white"
      >
        THINK
        <span className="bg-[linear-gradient(135deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)] bg-clip-text text-transparent">
          AD
        </span>
      </Link>
      <div className="mt-4 max-w-xs space-y-3 text-sm leading-relaxed text-gray-700 dark:text-white/90">
        <p className="font-medium text-gray-800 dark:text-white">{description}</p>
        {brandMeta ? (
          <div className="text-[11px] text-gray-500 dark:text-white/50">
            {brandMeta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ColumnCell({
  col,
}: {
  col: BrutalFooterColumn;
}) {
  return (
    <div className="rounded-[28px] bg-white p-8 shadow-lg ring-1 ring-gray-200/80 dark:bg-white/5 dark:shadow-[0_30px_120px_rgba(0,0,0,0.78)] dark:ring-white/10 tkad-neon-border">
      <h3 className="mb-4 font-display text-[11px] font-black uppercase tracking-[0.22em] text-gray-900 dark:text-white">
        {col.title}
      </h3>
      <ul className="space-y-2.5">
        {col.items.map((it, i) => {
          const cls =
            "text-sm font-medium tracking-tight text-gray-600 transition-colors hover:text-gray-900 dark:text-white/70 dark:hover:text-white";
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
