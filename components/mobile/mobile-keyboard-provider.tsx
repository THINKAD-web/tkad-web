"use client";

import { useMobileInputMode } from "@/hooks/use-mobile-input-mode";
import { useMobileKeyboardScroll } from "@/hooks/use-mobile-keyboard-scroll";

/** Mount once near app root to enable mobile keyboard scroll-into-view + inputMode hints. */
export function MobileKeyboardProvider() {
  useMobileKeyboardScroll(true);
  useMobileInputMode(true);
  return null;
}
