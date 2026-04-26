"use client";

/**
 * BrutalNav v2 — 고정 상단 헤더 (브루탈 미니멀)
 *
 * - position: sticky top-0, z-index 100 (`fixed` 와 시각적으로 동일하면서
 *   레이아웃 시프트 회피. 다른 페이지에서도 본문 padding-top 조정 불필요)
 * - 흰 배경 + 하단 2px 검정 보더
 * - 3컬럼 그리드: [로고+마크 | 네비링크들 | CTA]
 * - 로고: 18px Pretendard 800 + 24×24 검정 박스 마크 (안쪽 작은 흰 박스)
 * - 네비링크: 모노 12px, [01] Services 형식, 각 링크 사이 2px 보더,
 *   hover 시 검정 배경 + 흰 글자 (블록 인버트)
 * - CTA: 검정 배경 + 흰 글자 "→ Contact", hover 주황
 * - 모바일(<lg, ~1024px): 네비 링크 숨김 — 로고 + CTA 만 노출
 */
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrutalNavLink = { href: string; label: string };

export type BrutalNavProps = {
  /** 좌측 로고 텍스트 노드 (기본: THINKAD 워드마크) */
  logoText?: React.ReactNode;
  /** 가운데 네비 링크. 자동으로 [01] [02] … 번호 부여. */
  links: BrutalNavLink[];
  /** 우측 CTA */
  cta?: { href: string; label: string };
  className?: string;
};

function LogoMark() {
  // 24×24 검정 박스 + 안쪽 흰 박스(검정 보더) — 미니멀 마크
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center bg-bx-black"
    >
      <span className="block h-2.5 w-2.5 border-2 border-bx-black bg-bx-white" />
    </span>
  );
}

export function BrutalNav({
  logoText,
  links,
  cta,
  className,
}: BrutalNavProps) {
  const Logo = (
    <Link
      href="/"
      className="flex items-center gap-3 px-6 py-4 transition-colors hover:text-bx-accent"
    >
      <LogoMark />
      <span className="text-[18px] font-extrabold uppercase leading-none tracking-tight text-bx-black">
        {logoText ?? (
          <>
            THINK<span className="text-bx-accent">AD</span>
          </>
        )}
      </span>
    </Link>
  );

  return (
    <nav
      className={cn(
        "sticky top-0 z-[100] border-b-2 border-bx-black bg-bx-white",
        className,
      )}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch">
        {/* 로고 */}
        <div className="border-r-2 border-bx-black">{Logo}</div>

        {/* 네비 링크 — 모바일 숨김, lg 부터 노출 */}
        <ul className="hidden items-stretch lg:flex">
          {links.map((l, i) => (
            <li key={l.href} className="flex border-r-2 border-bx-black last:border-r-0">
              <Link
                href={l.href}
                className="flex items-center gap-2 px-5 py-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-bx-black transition-colors duration-150 hover:bg-bx-black hover:text-bx-white"
              >
                <span className="text-bx-gray-dim">[{String(i + 1).padStart(2, "0")}]</span>
                <span>{l.label}</span>
              </Link>
            </li>
          ))}
          {/* 모바일에서 빈 공간 (모바일에선 ul 자체가 hidden) */}
        </ul>
        {/* 모바일: 빈 가운데 셀 placeholder */}
        <div className="lg:hidden" />

        {/* CTA */}
        <div className="flex items-stretch border-l-2 border-bx-black">
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex items-center gap-2 bg-bx-black px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-bx-white transition-colors duration-150 hover:bg-bx-accent sm:px-6"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              <span>{cta.label}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
