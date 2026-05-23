"use client";

import { useMobileKeyboardScroll } from "@/hooks/use-mobile-keyboard-scroll";

/** Mount once near app root to enable mobile keyboard scroll-into-view. */
export function MobileKeyboardProvider() {
  useMobileKeyboardScroll(true);
  return null;
}
