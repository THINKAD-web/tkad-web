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
 * 모바일: 검색 아래 가로 스크롤 칩(모든 leaf) + 햄버거 → 패널(그룹·설명).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorizontalScrollGesture } from "@/lib/use-horizontal-scroll-gesture";
import { PublicNavSidebar } from "@/components/navigation/public-nav-sidebar";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";
import type { ResolvedPublicNavGroup } from "@/lib/navigation/build-public-nav";

export type BrutalNavLeaf = {
  href: string;
  label: string;
  desc?: string;
  /** e.g. BETA — 세부 메뉴에만 */
  badge?: string;
  /** React list key when the same href appears more than once */
  navKey?: string;
  icon?: LucideIcon;
};

function navLeafKey(leaf: BrutalNavLeaf): string {
  return leaf.navKey ?? leaf.href;
}
export type BrutalNavGroup = {
  id?: string;
  label: string;
  labelEn?: string;
  icon?: LucideIcon;
  items: BrutalNavLeaf[];
};
export type BrutalNavEntry = BrutalNavLeaf | BrutalNavGroup;

function isResolvedNavGroups(
  links: BrutalNavEntry[] | ResolvedPublicNavGroup[],
): links is ResolvedPublicNavGroup[] {
  return links.length > 0 && "labelEn" in links[0] && "items" in links[0] && !("href" in links[0]);
}

function isGroup(e: BrutalNavEntry): e is BrutalNavGroup {
  return (e as BrutalNavGroup).items !== undefined;
}

function flattenNavLeaves(entries: BrutalNavEntry[]): BrutalNavLeaf[] {
  const out: BrutalNavLeaf[] = [];
  for (const e of entries) {
    if (isGroup(e)) out.push(...e.items);
    else out.push(e);
  }
  return out;
}

export type BrutalNavProps = {
  /** 좌측 로고. 미지정 시 "THINKAD" 워드마크 */
  logo?: React.ReactNode;
  /** 가운데 네비 (단독 + 드롭다운 혼합) 또는 리뉴얼 IA 트리 */
  links: BrutalNavEntry[] | ResolvedPublicNavGroup[];
  /** 우측 CTA */
  cta?: { href: string; label: string };
  /** CTA 좌측에 노출할 보조 슬롯 (언어/테마/유저 토글 등). 데스크톱(md+) 전용. */
  extras?: ReactNode;
  /** 모바일 상단 바 — 문의 CTA·햄버거 사이 (언어·낮/밤 토글 등) */
  mobileBarExtras?: ReactNode;
  /** 모바일 햄버거 패널 — 찜·장바구니·로그인 등 (상단 링크 목록 아래) */
  mobileMenuExtras?: ReactNode | ((close: () => void) => ReactNode);
  /** 모바일 햄버거 패널 최하단 — 언어·다크모드 */
  mobileMenuFooter?: ReactNode;
  /** 데스크톱·모바일 공통 검색 UI (예: 매체 목록 `?q=` 연동) */
  search?: ReactNode;
  /** lg+ 고정 사이드바 사용 시 상단 바만 표시(가로 드롭다운 숨김) */
  sidebarLayout?: boolean;
  className?: string;
};

export function BrutalNav({
  logo,
  links,
  cta,
  extras,
  mobileBarExtras,
  mobileMenuExtras,
  mobileMenuFooter,
  search,
  sidebarLayout = false,
  className,
}: BrutalNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedGroupId, setMobileExpandedGroupId] = useState<string | null>(null);
  const mobileCategoryScrollRef = useRef<HTMLUListElement>(null);
  useHorizontalScrollGesture(mobileCategoryScrollRef);

  const navGroups: ResolvedPublicNavGroup[] | null = isResolvedNavGroups(links)
    ? links
    : null;
  const navEntries: BrutalNavEntry[] = navGroups ? [] : (links as BrutalNavEntry[]);

  const Logo = (
    <Link
      href="/"
      className="inline-flex shrink-0 items-baseline whitespace-nowrap text-[15px] font-black leading-none tracking-tight text-foreground sm:text-[16px] md:text-[20px] dark:text-white"
    >
      {logo ?? (
        <span className="inline-flex items-baseline whitespace-nowrap">
          <span className="font-black">THINK</span>
          <span className="tkad-home-accent-text font-black">AD</span>
        </span>
      )}
    </Link>
  );

  return (
    <nav
      className={cn(
        /* 다크: backdrop-filter 사용 시 /45 로 더 투명해지면 낮 랜딩(밝은 본문)이 비쳐 흰 메뉴 글자가 사라짐 — 불투명도 고정 */
        "tkad-nav-chrome sticky top-0 z-50 w-full max-w-full border-b border-border/60 bg-background text-foreground dark:border-white/10 dark:bg-[#05050a] dark:text-white",
        className,
      )}
    >
      {/* 데스크톱: 사이드바(lg+)는 상단 바만 · md~lg는 드롭다운 유지 */}
      <div
        className={cn(
          "hidden w-full min-w-0 items-center md:grid",
          sidebarLayout
            ? "min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] px-4 lg:min-h-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6"
            : "min-h-16 grid-cols-[auto_minmax(0,1fr)_auto]",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center px-4 lg:px-6",
            sidebarLayout && "lg:hidden",
            !sidebarLayout && "min-h-16",
          )}
        >
          {Logo}
        </div>
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5 py-1.5 lg:gap-3",
            sidebarLayout
              ? "min-h-14 justify-center px-1 lg:justify-start lg:px-2"
              : "min-h-16 justify-center px-1",
          )}
        >
          {search ? (
            <div
              className={cn(
                "max-w-full shrink-0",
                sidebarLayout
                  ? "hidden w-[min(10.5rem,18vw)] md:block lg:block lg:w-full lg:max-w-[18rem]"
                  : "hidden w-[min(10.5rem,18vw)] md:block lg:w-[min(6.5rem,11vw)]",
              )}
            >
              {search}
            </div>
          ) : null}
          <ul
            className={cn(
              "flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1 gap-y-1 px-0.5 sm:gap-x-1.5",
              sidebarLayout && "lg:hidden",
            )}
          >
            {navGroups
              ? navGroups.map((group) => (
                  <BrutalNavDropdown key={group.id} entry={group} />
                ))
              : navEntries.map((entry, i) =>
                  isGroup(entry) ? (
                    <BrutalNavDropdown key={`g-${i}`} entry={entry} />
                  ) : (
                    <li key={navLeafKey(entry)}>
                      <Link
                        href={entry.href}
                        className="inline-flex h-10 items-center rounded-xl px-3 text-[12px] font-semibold tracking-tight text-foreground transition-colors hover:bg-foreground/8 hover:text-foreground lg:px-4 lg:text-[13px] dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        {entry.label}
                      </Link>
                    </li>
                  ),
                )}
          </ul>
        </div>
        <div
          className={cn(
            "flex min-w-0 items-center justify-end gap-1.5 px-4 lg:gap-2 lg:px-6",
            sidebarLayout ? "min-h-14" : "min-h-16",
          )}
        >
          {extras ? (
            <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1">
              {extras}
            </div>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              className={cn(
                "tkad-neon-cta-clean inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-3 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 lg:px-4 lg:text-[12px] lg:tracking-[0.2em]",
                sidebarLayout && "lg:hidden",
              )}
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>

      {/* 모바일: 로고 + 문의 CTA + 햄버거 */}
      <div className="md:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:px-5">
          <div className="shrink-0">{Logo}</div>
          <div className="flex shrink-0 items-center gap-1.5">
            {cta ? (
              <Link
                href={cta.href}
                className="tkad-neon-cta-clean inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:px-3.5 sm:text-[11px] sm:tracking-[0.18em]"
              >
                {cta.label}
              </Link>
            ) : null}
            {mobileBarExtras ? (
              <div className="flex shrink-0 items-center gap-1">{mobileBarExtras}</div>
            ) : null}
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
        {search ? (
          <div className="border-t border-border/50 bg-background px-4 pb-3 pt-2 dark:border-white/10 dark:bg-[#05050a]">
            {search}
          </div>
        ) : null}
        {/* 좁은 미리보기·모바일에서도 IA 링크가 상단에 보이도록 (md 미만은 햄버거만 있으면 카테고리가 숨겨짐) */}
        <div
          className="border-t border-zinc-200/90 bg-zinc-100 px-3 py-2 dark:border-white/10 dark:bg-[#05050a]"
          aria-label="주요 카테고리"
        >
          <ul
            ref={mobileCategoryScrollRef}
            role="list"
            className="flex list-none gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
          >
            {(navGroups ?? []).map((group) => {
              const Icon = group.icon;
              return (
                <li key={group.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileExpandedGroupId(group.id);
                      setMobileOpen(true);
                    }}
                    className="inline-flex max-w-[10rem] touch-manipulation items-center gap-1.5 truncate rounded-full border border-zinc-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold leading-none tracking-tight text-zinc-900 shadow-sm dark:border-white/14 dark:bg-white/10 dark:text-white"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    {group.label}
                  </button>
                </li>
              );
            })}
            {!navGroups
              ? flattenNavLeaves(navEntries).map((leaf) => (
                  <li key={navLeafKey(leaf)} className="shrink-0">
                    <Link
                      href={leaf.href}
                      className="inline-flex max-w-[11rem] touch-manipulation truncate rounded-full border border-zinc-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold leading-none tracking-tight text-zinc-900 shadow-sm dark:border-white/14 dark:bg-white/10 dark:text-white"
                    >
                      {leaf.label}
                    </Link>
                  </li>
                ))
              : null}
          </ul>
        </div>
      </div>

      {/* 모바일 패널 — 라이트에선 솔리드 배경(네온 레이어는 다크만). 그렇지 않으면 검정 글자가 어두운 그라데이션에 묻힘 */}
      {mobileOpen && (
        <div className="relative overflow-hidden border-t border-zinc-200/90 bg-zinc-50 text-zinc-950 md:hidden dark:border-white/10 dark:bg-[#05050a] dark:text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 tkad-neon-depth hidden dark:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-15 tkad-neon-grid hidden dark:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 tkad-hero-noise opacity-[0.06] mix-blend-overlay hidden dark:block"
          />
          {navGroups ? (
            <PublicNavSidebar
              groups={navGroups}
              initialOpenId={mobileExpandedGroupId}
              onNavigate={() => {
                setMobileOpen(false);
                setMobileExpandedGroupId(null);
              }}
              className="relative max-h-[min(70dvh,520px)] overflow-y-auto"
            />
          ) : (
            <ul className="relative divide-y divide-zinc-200 dark:divide-white/10">
              {navEntries.map((entry, i) =>
                isGroup(entry) ? (
                  <li key={`mg-${i}`}>
                    <p className="bg-zinc-200/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:bg-white/5 dark:text-white/70">
                      {entry.label}
                    </p>
                    <ul className="divide-y divide-zinc-200 dark:divide-white/10">
                      {entry.items.map((leaf) => (
                        <li key={navLeafKey(leaf)}>
                          <Link
                            href={leaf.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex min-h-[3.25rem] items-center gap-2 px-5 py-3 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:text-white dark:hover:bg-white/6"
                          >
                            {leaf.label}
                            {leaf.badge ? <NavBetaBadge /> : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={navLeafKey(entry)}>
                    <Link
                      href={entry.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-[3.25rem] items-center px-5 py-3 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:text-white dark:hover:bg-white/6"
                    >
                      {entry.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
          {mobileMenuExtras ? (
            <div className="relative border-t border-zinc-200 dark:border-white/10">
              {typeof mobileMenuExtras === "function"
                ? mobileMenuExtras(() => setMobileOpen(false))
                : mobileMenuExtras}
            </div>
          ) : null}
          {cta ? (
            <div className="relative border-t border-zinc-200 dark:border-white/10 p-4">
              <Link
                href={cta.href}
                onClick={() => setMobileOpen(false)}
                className="tkad-neon-cta-clean inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors"
              >
                {cta.label}
              </Link>
            </div>
          ) : null}
          {mobileMenuFooter ? (
            <div className="relative flex items-center justify-center gap-2 border-t border-zinc-200 p-4 dark:border-white/10">
              {mobileMenuFooter}
            </div>
          ) : null}
        </div>
      )}
    </nav>
  );
}

/** 데스크톱 드롭다운 — hover 시 펼침, 외부 클릭/blur 시 닫힘 */
function BrutalNavDropdown({
  entry,
}: {
  entry: BrutalNavGroup | ResolvedPublicNavGroup;
}) {
  const GroupIcon = entry.icon;
  const { resolvedTheme } = useTheme();
  /** 테마가 light 일 때만 밝은 패널(히어로 비침 방지). 그 외(다크·미확정)는 짙은 패널 — `dark:`+twMerge 조합이 bg-white 만 남는 문제 회피 */
  const lightPanel = resolvedTheme === "light";
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
          "inline-flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-[12px] font-semibold tracking-tight text-foreground transition-colors hover:bg-foreground/8 hover:text-foreground lg:gap-1.5 lg:px-4 lg:text-[13px] dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
          open && "bg-foreground/6 text-foreground dark:bg-white/12 dark:text-white",
        )}
      >
        {GroupIcon ? (
          <GroupIcon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
        ) : null}
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
          className={cn(
            "absolute left-1/2 top-full z-[100] mt-3 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border py-1 shadow-xl ring-1",
            lightPanel
              ? "border-zinc-200/95 bg-white text-zinc-950 ring-black/[0.06] shadow-xl"
              : "border-white/12 bg-zinc-950 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-white/10",
          )}
        >
          {entry.labelEn ? (
            <div
              className={cn(
                "border-b px-4 py-3",
                lightPanel ? "border-zinc-100 bg-zinc-50/80" : "border-white/10 bg-white/5",
              )}
            >
              <p
                className={cn(
                  "text-[13px] font-bold tracking-tight",
                  lightPanel ? "text-zinc-900" : "text-white",
                )}
              >
                {entry.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                  lightPanel ? "text-zinc-500" : "text-white/45",
                )}
              >
                {entry.labelEn}
              </p>
            </div>
          ) : null}
          <ul
            className={cn(
              "divide-y",
              lightPanel ? "divide-zinc-100" : "divide-white/12",
            )}
          >
            {entry.items.map((leaf) => {
              const LeafIcon = leaf.icon;
              return (
                <li key={navLeafKey(leaf)}>
                  <Link
                    href={leaf.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex gap-2.5 px-4 py-3.5 transition-colors",
                      lightPanel ? "hover:bg-zinc-100" : "hover:bg-white/12",
                    )}
                  >
                    {LeafIcon ? (
                      <LeafIcon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          lightPanel ? "text-zinc-500" : "text-white/55",
                        )}
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "flex flex-wrap items-center gap-1.5 text-[13px] font-semibold leading-snug tracking-tight",
                          lightPanel ? "text-zinc-900" : "text-white",
                        )}
                      >
                        {leaf.label}
                        {leaf.badge ? <NavBetaBadge /> : null}
                      </span>
                      {leaf.desc ? (
                        <span
                          className={cn(
                            "mt-1 block text-[12px] leading-relaxed tracking-tight",
                            lightPanel ? "text-zinc-600" : "text-zinc-300",
                          )}
                        >
                          {leaf.desc}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
