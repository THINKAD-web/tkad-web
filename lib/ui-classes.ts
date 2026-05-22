/**
 * TKAD 공개 UI 디자인 토큰 — 타이포·간격·버튼·카드·뱃지 통일.
 * Tailwind 유틸 조합; 컴포넌트에서 `cn(ui.pageHeadline, className)` 형태로 사용.
 */
export const ui = {
  /** 페이지 히어로 h1 */
  pageHeadline:
    "text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-5xl lg:text-6xl",

  /** 섹션 h2 */
  sectionHeadline:
    "text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl lg:text-3xl",

  /** 카드 제목 */
  cardTitle:
    "text-base font-semibold leading-tight text-gray-900 dark:text-white md:text-lg",

  /** 본문 */
  body: "text-sm leading-relaxed tracking-normal text-gray-600 dark:text-white/70 md:text-base",

  /** 캡션 / 보조 레이블 */
  caption:
    "text-xs leading-normal tracking-wider uppercase text-gray-400 dark:text-white/40",

  /** 섹션 코드 라인 (// 01 · CASES) */
  sectionLabel:
    "mb-3 text-xs font-medium uppercase tracking-widest text-cyan-600/60 dark:text-cyan-400/60",

  /** 섹션 세로 패딩 */
  sectionY: "py-16 md:py-24",

  /** 레이아웃 컨테이너 */
  container: "mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8",
  containerNarrow: "mx-auto w-full max-w-4xl px-4 md:px-6 lg:px-8",

  /** 그리드 / 목록 gap */
  gridGap: "gap-4 md:gap-6",
  listGap: "gap-3 md:gap-4",

  /** 카드 패딩 */
  cardPadSm: "p-4 md:p-5",
  cardPadMd: "p-5 md:p-6",
  cardPadLg: "p-6 md:p-8",

  /** Primary CTA */
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 md:text-base",

  /** Secondary CTA */
  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-white/20 dark:text-white dark:hover:bg-white/10 md:text-base",

  /** Ghost 링크형 */
  btnGhost:
    "inline-flex items-center justify-center gap-2 text-sm font-medium text-violet-600 underline-offset-4 transition-colors hover:text-violet-500 hover:underline dark:text-violet-400 dark:hover:text-violet-300 md:text-base",

  /** 다크 네온 카드 */
  cardDark:
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5",

  /** 라이트 카드 */
  cardLight:
    "rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none",

  /** 상태 뱃지 */
  badgeBeta: "rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400",
  badgeNew: "rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-600 dark:text-cyan-400",
  badgeActive:
    "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400",
  badgePending:
    "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400",
  badgeError:
    "rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400",

  /** 아이콘 크기 */
  iconNav: "h-4 w-4",
  iconCard: "h-5 w-5",
  iconHero: "h-6 w-6",
  iconBtn: "h-4 w-4",

  /** 빈 상태 */
  emptyIcon: "mx-auto h-12 w-12 text-gray-300 dark:text-white/20",
  emptyTitle: "text-sm font-medium text-gray-400 dark:text-white/50",
  emptySub: "text-xs text-gray-300 dark:text-white/30",

  /** 스켈레톤 */
  skeleton: "animate-pulse rounded-xl bg-gray-200 dark:bg-white/10",
  skeletonRound: "animate-pulse rounded-full bg-gray-200 dark:bg-white/10",
} as const;

/** @deprecated — 개별 import 대신 `ui` 객체 사용 권장 */
export const {
  pageHeadline: uiPageHeadline,
  sectionHeadline: uiSectionHeadline,
  cardTitle: uiCardTitle,
  body: uiBody,
  caption: uiCaption,
  sectionLabel: uiSectionLabel,
  sectionY: uiSectionY,
  container: uiContainer,
  btnPrimary: uiBtnPrimary,
  btnSecondary: uiBtnSecondary,
  btnGhost: uiBtnGhost,
  cardDark: uiCardDark,
  cardLight: uiCardLight,
} = ui;
