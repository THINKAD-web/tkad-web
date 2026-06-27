"use client";

import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  className?: string;
};

/** 지도 위 floating 빈 결과 안내 */
export function MediaMapFloatingEmptyState({ isKo = true, className }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none mx-auto max-w-sm rounded-2xl border border-border/80 bg-card/92 px-4 py-3 text-center shadow-lg shadow-black/10 backdrop-blur-md",
        "dark:border-white/12 dark:bg-[#0a0a12]/90 dark:shadow-black/45",
        className,
      )}
      role="status"
    >
      <p className="text-lg" aria-hidden>
        🔍
      </p>
      <p className="tkad-type-title text-foreground">
        {isKo ? "이 화면에 매체가 없습니다" : "No media in this view"}
      </p>
      <p className="tkad-type-meta mt-1 text-tkad-secondary">
        {isKo
          ? "지도를 이동하거나 필터를 조정해 보세요"
          : "Pan the map or adjust filters"}
      </p>
    </div>
  );
}
