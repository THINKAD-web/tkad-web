"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useMobileNavDirection } from "@/hooks/use-mobile-nav-direction";
import { cn } from "@/lib/utils";

function subscribeMd(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useMdUp() {
  return useSyncExternalStore(
    subscribeMd,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true,
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export default function LocaleTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mdUp = useMdUp();
  const reduced = usePrefersReducedMotion();
  const direction = useMobileNavDirection();

  if (mdUp || reduced) {
    return <>{children}</>;
  }

  return (
    <div
      key={pathname ?? "/"}
      className={cn(
        "tkad-locale-page-enter flex min-h-0 flex-1 flex-col",
        direction > 0 ? "tkad-locale-page-enter--forward" : "tkad-locale-page-enter--back",
      )}
    >
      {children}
    </div>
  );
}
