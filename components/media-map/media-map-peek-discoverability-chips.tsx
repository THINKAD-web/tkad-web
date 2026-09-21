"use client";

import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  mobileListCount: number;
  listCount: number;
  onOpenList: () => void;
  className?: string;
};

const chipBase =
  "tkad-type-meta inline-flex min-h-9 max-w-full items-center rounded-full border px-3 py-1.5 font-semibold transition-colors";

/** 모바일 peek 시트 — 이동형·목록 진입 칩 */
export function MediaMapPeekDiscoverabilityChips({
  isKo,
  mobileListCount,
  listCount,
  onOpenList,
  className,
}: Props) {
  if (listCount <= 0 && mobileListCount <= 0) return null;

  const fmt = (n: number) =>
    isKo ? n.toLocaleString("ko-KR") : n.toLocaleString();

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-screenshot="media-map-peek-chips"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {mobileListCount > 0 ? (
        <button
          type="button"
          onClick={onOpenList}
          className={cn(
            chipBase,
            "border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
          )}
        >
          {isKo ? `이동형 ${fmt(mobileListCount)}건` : `${fmt(mobileListCount)} mobile`}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpenList}
        className={cn(
          chipBase,
          "border-gray-200 bg-white text-foreground hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
        )}
      >
        {isKo ? "목록 보기" : "View list"}
      </button>
    </div>
  );
}
