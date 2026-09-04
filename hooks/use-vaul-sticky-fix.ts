"use client";

import { useEffect } from "react";

/**
 * vaul 의 `modal` 옵션은 내부적으로 react-remove-scroll 을 통해
 * `body[data-scroll-locked]` 에 `overflow:hidden !important` 를 건다 — 이건
 * PART 1(#531)에서 고친 "body 에 overflow:hidden 걸면 스크롤된 상태의 sticky/fixed
 * 헤더가 화면 밖으로 날아가는" 버그와 정확히 같은 메커니즘이다
 * (components/navigation/desktop-global-nav.tsx 참고). vaul 은 라이브러리 내부
 * 동작이라 우리 쪽 useEffect 로 우회할 수 없으므로, html 에 우리 자신의(안전한)
 * 잠금을 걸고 globals.css 에서 `.tkad-vaul-sticky-fix body[data-scroll-locked]`
 * 를 무력화한다.
 *
 * `<Drawer.Root modal>` 을 쓰는 모든 곳에서 이 훅을 함께 호출할 것.
 */
export function useVaulStickyFix(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    html.classList.add("tkad-vaul-sticky-fix");
    return () => {
      html.style.overflow = prevOverflow;
      html.classList.remove("tkad-vaul-sticky-fix");
    };
  }, [open]);
}
