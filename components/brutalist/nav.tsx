"use client";

/**
 * BrutalNav v2 — 브루탈리스트 헤더 (b930b10 IA 호환).
 *
 * 메뉴 구조:
 *   - 단독 링크 (NavLeaf): { href, label }
 *   - 드롭다운 그룹 (NavGroup): { label, items: NavLeaf[] }
 *   - 우측 CTA (옵션)
 *
 * 데스크톱: 3컬 그리드 (로고 | 링크 + 드롭다운 | CTA), 2px 검정 보더.
 * 모바일: 햄버거 → 패널. 그룹은 펼침 형태로 모든 leaf 노출.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { BtnBlock } from "@/components/brutalist/btn-block";
import { cn } from "@/lib/utils";

export type BrutalNavLeaf = { href: string; label: string; desc?: string };
export type BrutalNavGroup = { label: string; items: BrutalNavLeaf[] };
export type BrutalNavEntry = BrutalNavLeaf | BrutalNavGroup;

function isGroup(e: BrutalNavEntry): e is BrutalNavGroup {
  return (e as BrutalNavGroup).items !== undefined;
}

export type BrutalNavProps = {
  /** 좌측 로고. 미지정 시 "THINKAD" 워드마크 */
  logo?: React.ReactNode;
  /** 가운데 네비 (단독 + 드롭다운 혼합) */
  links: BrutalNavEntry[];
  /** 우측 CTA */
  cta?: { href: string; label: string };
  className?: string;
};

export function BrutalNav({ logo, links, cta, className }: BrutalNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* 데스크톱: 3컬 그리드 */}
      <div className="hidden grid-cols-[auto_1fr_auto] items-stretch md:grid">
        <div className="flex items-center border-r-2 border-bx-black px-6 py-4">
          {Logo}
        </div>
        <ul className="flex items-center justify-center gap-1 px-3 py-2">
          {links.map((entry, i) =>
            isGroup(entry) ? (
              <BrutalNavDropdown key={`g-${i}`} entry={entry} />
            ) : (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="inline-block px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent"
                >
                  {entry.label}
                </Link>
              </li>
            ),
          )}
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
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* 모바일 패널 — 그룹은 모든 leaf 펼침 */}
      {mobileOpen && (
        <div className="border-t-2 border-bx-black bg-bx-white md:hidden">
          <ul className="divide-y-2 divide-bx-black">
            {links.map((entry, i) =>
              isGroup(entry) ? (
                <li key={`mg-${i}`}>
                  <p className="bg-bx-off px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {entry.label} ]
                  </p>
                  <ul className="divide-y-2 divide-bx-black">
                    {entry.items.map((leaf) => (
                      <li key={leaf.href}>
                        <Link
                          href={leaf.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-off hover:text-bx-accent"
                        >
                          {leaf.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-5 py-4 font-mono text-xs uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-off hover:text-bx-accent"
                  >
                    {entry.label}
                  </Link>
                </li>
              ),
            )}
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

/** 데스크톱 드롭다운 — hover 시 펼침, 외부 클릭/blur 시 닫힘 */
function BrutalNavDropdown({ entry }: { entry: BrutalNavGroup }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLLIElement>(null);

  const scheduleClose = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpen(false), 140);
  };
  const cancelClose = () => {
    if (closeRef.current) {
      clearTimeout(closeRef.current);
      closeRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (closeRef.current) clearTimeout(closeRef.current);
    };
  }, []);

  return (
    <li
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent",
          open && "text-bx-accent",
        )}
      >
        {entry.label}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-0 w-72 -translate-x-1/2 border-2 border-bx-black bg-bx-white"
        >
          <ul className="divide-y-2 divide-bx-black">
            {entry.items.map((leaf) => (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  <span className="block font-mono text-xs font-semibold uppercase tracking-[0.22em]">
                    {leaf.label}
                  </span>
                  {leaf.desc ? (
                    <span className="mt-1 block font-mono text-[10px] tracking-tight text-bx-gray-dim">
                      {leaf.desc}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
