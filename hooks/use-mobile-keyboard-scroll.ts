"use client";

import { useEffect } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function scrollFocusedIntoView(target: HTMLElement) {
  window.requestAnimationFrame(() => {
    const viewport = window.visualViewport;
    const rect = target.getBoundingClientRect();
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportTop = viewport?.offsetTop ?? 0;

    const visibleBottom = viewportTop + viewportHeight - 16;
    const visibleTop = viewportTop + 72;

    if (rect.bottom > visibleBottom || rect.top < visibleTop) {
      const scrollY =
        window.scrollY +
        rect.top -
        viewportTop -
        Math.max(0, (viewportHeight - rect.height) / 2 - 48);

      window.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
      return;
    }

    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/**
 * On mobile, scroll focused inputs into view when the virtual keyboard opens.
 * Uses focusin + visualViewport resize as signals.
 */
export function useMobileKeyboardScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let activeEl: HTMLElement | null = null;

    const onFocusIn = (event: FocusEvent) => {
      if (!isMobileViewport()) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(FOCUSABLE)) return;
      activeEl = target;
      scrollFocusedIntoView(target);
    };

    const onFocusOut = () => {
      activeEl = null;
    };

    const onViewportResize = () => {
      if (!isMobileViewport() || !activeEl) return;
      scrollFocusedIntoView(activeEl);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("scroll", onViewportResize);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("scroll", onViewportResize);
      activeEl = null;
    };
  }, [enabled]);
}
