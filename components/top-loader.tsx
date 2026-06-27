"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isInternalNavigationClick,
  pathnameFromHref,
} from "@/lib/navigation-pending";
import { cn } from "@/lib/utils";

const SHOW_DEBOUNCE_MS = 120;
const COMPLETE_VISIBLE_MS = 480;

/**
 * 클라이언트 라우트 전환 인디케이터.
 * - 클릭 직후(디바운스) RSC 대기 구간부터 표시
 * - pathname 확정 후 짧게 유지했다가 페이드아웃
 * 최초 진입(풀 리로드)은 스킵.
 */
export default function TopLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const firstPath = useRef(true);
  const pathnameRef = useRef(pathname);
  const pendingNav = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a") ?? null;
      if (!isInternalNavigationClick(anchor, event)) return;

      const nextPath = pathnameFromHref(anchor.href);
      if (nextPath === pathnameRef.current) return;

      pendingNav.current = true;
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => {
        if (pendingNav.current) setVisible(true);
      }, SHOW_DEBOUNCE_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    pendingNav.current = false;
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (firstPath.current) {
      firstPath.current = false;
      return;
    }

    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), COMPLETE_VISIBLE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] transition-opacity duration-500 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 bg-border/35 bg-muted/80 dark:bg-white/8" />
        <div className="nav-loading-capsule absolute inset-y-0 left-0 h-full w-[min(32vw,12rem)] bg-gradient-to-r from-transparent via-violet-500/85 to-transparent shadow-[0_0_14px_rgba(139,92,246,0.38)] dark:via-cyan-400/75 dark:shadow-[0_0_16px_rgba(34,211,238,0.32)]" />
      </div>
    </div>
  );
}
