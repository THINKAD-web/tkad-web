"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useMobileNavDirection } from "@/hooks/use-mobile-nav-direction";

function subscribeMd(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
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

export default function LocaleTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mdUp = useMdUp();
  const reduced = useReducedMotion();
  const direction = useMobileNavDirection();

  if (mdUp || reduced) {
    return <>{children}</>;
  }

  const enterX = direction > 0 ? 20 : -20;

  return (
    <motion.div
      key={pathname ?? "/"}
      initial={{ opacity: 0.94, x: enterX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
