"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * 클라이언트 라우트 전환 시 상단 인디터미넌트 바만 표시.
 * 전역 블러·스피너는 제거해 깜빡임·답답함을 줄임 (요즘 SaaS/대시보드 흐름).
 * 최초 진입 한 번은 스킵 (풀 리로드 시 불필요한 플래시 방지).
 */
export default function TopLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const firstPath = useRef(true);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 라우트 변경 시 한 번 펄스
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 720);
    return () => clearTimeout(hide);
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
        <div className="absolute inset-0 bg-border/35 dark:bg-white/8 bg-gray-100" />
        <div className="nav-loading-capsule absolute inset-y-0 left-0 h-full w-[min(32vw,12rem)] bg-gradient-to-r from-transparent via-violet-500/85 to-transparent shadow-[0_0_14px_rgba(139,92,246,0.38)] dark:via-cyan-400/75 dark:shadow-[0_0_16px_rgba(34,211,238,0.32)]" />
      </div>
    </div>
  );
}
