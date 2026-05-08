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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
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
  /** CTA 좌측에 노출할 보조 슬롯 (언어/테마/유저 토글 등). b930b10 의 부가 기능 보존용. */
  extras?: ReactNode;
  className?: string;
};

export function BrutalNav({ logo, links, cta, extras, className }: BrutalNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const Logo = (
    <Link
      href="/"
      className="text-[18px] font-black tracking-tight text-foreground sm:text-[20px] dark:text-white"
    >
      {logo ?? (
        <>
          <span className="font-black">THINK</span>
          <span className="tkad-home-accent-text font-black">AD</span>
        </>
      )}
    </Link>
  );

  return (
    <nav
      className={cn(
        "tkad-nav-chrome sticky top-0 z-50 border-b border-border/60 bg-background/75 text-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-background/45 dark:border-white/10 dark:bg-[#05050a]/65 dark:text-white dark:supports-[backdrop-filter]:bg-[#05050a]/45",
        className,
      )}
    >
      {/* 데스크톱: 3컬 그리드 */}
      <div className="hidden h-16 grid-cols-[auto_1fr_auto] items-center md:grid">
        <div className="flex h-16 items-center px-6">
          {Logo}
        </div>
        <ul className="flex h-16 items-center justify-center gap-1 px-3">
          {links.map((entry, i) =>
            isGroup(entry) ? (
              <BrutalNavDropdown key={`g-${i}`} entry={entry} />
            ) : (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold tracking-tight text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground dark:text-white/80 dark:hover:bg-white/6 dark:hover:text-white"
                >
                  {entry.label}
                </Link>
              </li>
            ),
          )}
        </ul>
        <div className="flex h-16 items-center justify-end gap-2 px-6">
          {extras ? (
            <div className="flex items-center gap-1">{extras}</div>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              className="tkad-neon-cta-clean inline-flex h-10 items-center justify-center rounded-xl px-4 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>

      {/* 모바일: 로고 + extras + 햄버거 */}
      <div className="flex h-16 items-center justify-between gap-2 px-5 md:hidden">
        {Logo}
        <div className="flex items-center gap-1.5">
          {extras ? <div className="flex items-center gap-1">{extras}</div> : null}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-foreground backdrop-blur transition-all duration-300 hover:border-border hover:bg-card dark:border-white/12 dark:bg-white/6 dark:text-white dark:hover:border-white/22 dark:hover:bg-white/10"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 모바일 패널 — 그룹은 모든 leaf 펼침 */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background text-foreground md:hidden dark:border-white/10 dark:bg-[#05050a] dark:text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-15 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.06] mix-blend-overlay" />
          <ul className="relative divide-y divide-white/10">
            {links.map((entry, i) =>
              isGroup(entry) ? (
                <li key={`mg-${i}`}>
                  <p className="bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                    {entry.label}
                  </p>
                  <ul className="divide-y divide-white/10">
                    {entry.items.map((leaf) => (
                      <li key={leaf.href}>
                        <Link
                          href={leaf.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex min-h-[3.25rem] items-center px-5 py-3 text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/60 dark:text-white dark:hover:bg-white/6"
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
                    className="flex min-h-[3.25rem] items-center px-5 py-3 text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/60 dark:text-white dark:hover:bg-white/6"
                  >
                    {entry.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
          {cta ? (
            <div className="relative border-t border-white/10 p-4">
              <Link
                href={cta.href}
                onClick={() => setMobileOpen(false)}
                className="tkad-neon-cta-clean inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors"
              >
                {cta.label}
              </Link>
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
          "inline-flex h-10 items-center gap-1 rounded-xl px-4 text-[13px] font-semibold tracking-tight text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground dark:text-white/80 dark:hover:bg-white/6 dark:hover:text-white",
          open && "text-foreground dark:text-white",
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
          className="absolute left-1/2 top-full z-50 mt-4 w-64 max-w-[calc(100vw-2.5rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/70 bg-card/90 py-1 text-foreground shadow-[0_30px_120px_rgba(0,0,0,0.28)] backdrop-blur dark:border-white/10 dark:bg-black/55 dark:text-white dark:shadow-[0_30px_120px_rgba(0,0,0,0.78)]"
        >
          <ul className="divide-y divide-border/60 dark:divide-white/10">
            {entry.items.map((leaf) => (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition-colors hover:bg-muted/60 dark:hover:bg-white/6"
                >
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-foreground dark:text-white">
                    {leaf.label}
                  </span>
                  {leaf.desc ? (
                    <span className="mt-1 block text-[11px] leading-snug tracking-tight text-muted-foreground dark:text-white/65">
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
