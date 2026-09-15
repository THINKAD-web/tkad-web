"use client";

import { useEffect } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

/** Minimum ms between programmatic scrolls — avoids fighting iOS keyboard animation. */
const SCROLL_COOLDOWN_MS = 120;

/** Ignore visualViewport noise smaller than this (px). */
const VIEWPORT_DELTA_PX = 8;

const BOTTOM_CHROME_PX = 88; // mobile tab bar (~5.5rem) + small gap
const TOP_EXTRA_PX = 16;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function readNavSafeHeightPx(): number {
  if (typeof document === "undefined") return 72;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--nav-safe-height",
  );
  if (!raw.trim()) return 72;
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.height = raw.trim();
  document.documentElement.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px > 0 ? px : 72;
}

export type VisibleViewportBounds = {
  top: number;
  bottom: number;
};

/** Visible document band while the mobile keyboard is open (visual viewport). */
export function getVisibleViewportBounds(
  viewport: VisualViewport | null | undefined,
  navSafeHeightPx: number,
): VisibleViewportBounds {
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  return {
    top: viewportTop + navSafeHeightPx + TOP_EXTRA_PX,
    bottom: viewportTop + viewportHeight - BOTTOM_CHROME_PX,
  };
}

export function isFocusedInputObscured(
  target: HTMLElement,
  bounds: VisibleViewportBounds,
): boolean {
  const rect = target.getBoundingClientRect();
  return rect.bottom > bounds.bottom || rect.top < bounds.top;
}

export function computeScrollTopForInput(
  target: HTMLElement,
  _bounds: VisibleViewportBounds,
  viewport: VisualViewport | null | undefined,
): number {
  const rect = target.getBoundingClientRect();
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const scrollY =
    window.scrollY +
    rect.top -
    viewportTop -
    Math.max(0, (viewportHeight - rect.height) / 2 - 48);
  return Math.max(0, scrollY);
}

function createMobileKeyboardScrollHandler() {
  let activeEl: HTMLElement | null = null;
  let lastScrollAt = 0;
  let rafId = 0;
  let lastViewportHeight = 0;
  let lastViewportOffsetTop = 0;

  const scrollIfNeeded = (target: HTMLElement) => {
    if (!isMobileViewport()) return;

    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const bounds = getVisibleViewportBounds(viewport, readNavSafeHeightPx());

      if (!isFocusedInputObscured(target, bounds)) {
        return;
      }

      const now = Date.now();
      if (now - lastScrollAt < SCROLL_COOLDOWN_MS) {
        return;
      }

      lastScrollAt = now;
      window.scrollTo({
        top: computeScrollTopForInput(target, bounds, viewport),
        behavior: "instant",
      });
    });
  };

  const onViewportChange = () => {
    if (!activeEl || !isMobileViewport()) return;

    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const offsetTop = viewport?.offsetTop ?? 0;

    const heightDelta = Math.abs(height - lastViewportHeight);
    const offsetDelta = Math.abs(offsetTop - lastViewportOffsetTop);
    if (
      lastViewportHeight > 0 &&
      heightDelta < VIEWPORT_DELTA_PX &&
      offsetDelta < VIEWPORT_DELTA_PX
    ) {
      return;
    }

    lastViewportHeight = height;
    lastViewportOffsetTop = offsetTop;
    scrollIfNeeded(activeEl);
  };

  const reset = () => {
    activeEl = null;
    lastScrollAt = 0;
    lastViewportHeight = 0;
    lastViewportOffsetTop = 0;
    window.cancelAnimationFrame(rafId);
  };

  return {
    setActive: (el: HTMLElement | null) => {
      activeEl = el;
    },
    scrollIfNeeded,
    onViewportChange,
    reset,
  };
}

/**
 * On mobile, scroll focused inputs into view when the virtual keyboard opens.
 * Uses focusin + visualViewport resize as signals.
 */
export function useMobileKeyboardScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handler = createMobileKeyboardScrollHandler();

    const onFocusIn = (event: FocusEvent) => {
      if (!isMobileViewport()) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(FOCUSABLE)) return;
      handler.setActive(target);
      handler.scrollIfNeeded(target);
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof HTMLElement && next.matches(FOCUSABLE)) {
        handler.setActive(next);
        return;
      }
      handler.reset();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", handler.onViewportChange);
    window.visualViewport?.addEventListener("scroll", handler.onViewportChange);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener(
        "resize",
        handler.onViewportChange,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handler.onViewportChange,
      );
      handler.reset();
    };
  }, [enabled]);
}
