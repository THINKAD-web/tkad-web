"use client";

/**
 * BrutalNav — 브루탈리스트 헤더.
 * 3컬럼 그리드 (로고 | 링크 | CTA) + 2px 검정 하단 보더 + sticky.
 *
 * 모바일은 햄버거 토글로 링크 접고 펼치기. 기존 `Header` 와 같은 sticky/스크롤
 * 트랜지션 흐름이지만 시각 톤만 브루탈로 교체.
 */
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { BtnBlock } from "@/components/brutalist/btn-block";
import { cn } from "@/lib/utils";

export type BrutalNavLink = { href: string; label: string };

export type BrutalNavProps = {
  /** 좌측 로고. 미지정 시 "THINKAD" 모노스페이스 워드마크 */
  logo?: React.ReactNode;
  /** 가운데 네비 링크 */
  links: BrutalNavLink[];
  /** 우측 CTA. 없으면 셀 비움. */
  cta?: { href: string; label: string };
  className?: string;
};

export function BrutalNav({ logo, links, cta, className }: BrutalNavProps) {
  const [open, setOpen] = useState(false);

  const Logo = (
    <Link
      href="/"
      className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-bx-black"
    >
      {logo ?? (
        <>
          THINK<span className="text-bx-accent">AD</span>
        </>
      )}
    </Link>
  );

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b-2 border-bx-black bg-bx-white",
        className,
      )}
    >
      {/* 데스크톱: 3컬럼 그리드 */}
      <div className="hidden grid-cols-[auto_1fr_auto] items-stretch md:grid">
        <div className="flex items-center border-r-2 border-bx-black px-6 py-4">
          {Logo}
        </div>
        <ul className="flex items-center justify-center gap-8 px-6 py-4">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end border-l-2 border-bx-black px-4 py-2.5">
          {cta ? (
            <BtnBlock href={cta.href} variant="primary" size="sm">
              {cta.label}
            </BtnBlock>
          ) : null}
        </div>
      </div>

      {/* 모바일: 로고 + 햄버거 */}
      <div className="flex items-center justify-between px-5 py-4 md:hidden">
        {Logo}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* 모바일 패널 */}
      {open && (
        <div className="border-t-2 border-bx-black bg-bx-white md:hidden">
          <ul className="divide-y-2 divide-bx-black">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-4 font-mono text-xs uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-off hover:text-bx-accent"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {cta ? (
            <div className="border-t-2 border-bx-black p-4">
              <BtnBlock
                href={cta.href}
                variant="primary"
                size="md"
                className="w-full"
              >
                {cta.label}
              </BtnBlock>
            </div>
          ) : null}
        </div>
      )}
    </nav>
  );
}
