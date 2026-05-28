/** 홈·온보딩 등 정적 그리드 — compare/cart 미사용 MediaCard용 noop */
export const mediaCardStaticHandlers = {
  inCompare: false,
  inCart: false,
  onToggleCompare: () => {},
  onToggleCart: () => {},
} as const;
