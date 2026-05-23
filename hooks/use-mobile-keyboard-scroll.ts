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

    const onViewportResize = () => {
      if (!isMobileViewport() || !activeEl) return;
      scrollFocusedIntoView(activeEl);
    };

    document.addEventListener("focusin", onFocusIn);
    window.visualViewport?.addEventListener("resize", onViewportResize);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      activeEl = null;
    };
  }, [enabled]);
}
