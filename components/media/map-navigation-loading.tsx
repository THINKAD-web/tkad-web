"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

/** Full-screen overlay shown immediately when navigating list → `/media/map`. */
export function MapNavigationLoading() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-gray-50/95 backdrop-blur-sm dark:bg-[#020202]/95"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-screenshot="map-navigation-loading"
    >
      <Loader2
        className="h-10 w-10 animate-spin text-[color:var(--qp-accent)]"
        aria-hidden
      />
      <p className="tkad-type-title text-gray-800 dark:text-white/90">
        {isKo ? "지도 불러오는 중…" : "Loading map…"}
      </p>
    </div>
  );
}
