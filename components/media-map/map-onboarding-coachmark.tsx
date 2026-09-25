"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type MapOnboardingCoachmarkProps = {
  open: boolean;
  title: string;
  description: string;
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
  placement?: "below" | "above";
  /** 통짜 온보딩 일러스트 (검색·필터·분석) — 1/3 코치마크 등 */
  illustrationSrc?: string;
  /** `start`: 타깃 왼쪽 끝에 맞춤 — 좁은 타깃 아래 넓은 코치마크가 좌측으로 넘치지 않게 */
  align?: "center" | "start";
};

/** 지도 위 소형 1회성 코치마크 — 검색 버튼 등 타깃 근처에 배치 */
export function MapOnboardingCoachmark({
  open,
  title,
  description,
  dismissLabel,
  onDismiss,
  className,
  placement = "below",
  illustrationSrc,
  align = "center",
}: MapOnboardingCoachmarkProps) {
  const arrowX = align === "start" ? "left-6" : "left-1/2 -translate-x-1/2";

  if (!open) return null;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto absolute z-[12] w-[min(18rem,calc(100vw-2rem))]",
        align === "start" ? "left-0" : "left-1/2 -translate-x-1/2",
        placement === "below" ? "top-full mt-2" : "bottom-full mb-2",
        className,
      )}
      data-map-onboarding="coachmark"
    >
      <div
        className={cn(
          "relative rounded-xl border border-[color:var(--qp-accent)]/40 bg-card/95 px-3.5 py-3 text-left shadow-xl shadow-[color:var(--qp-accent)]/15 backdrop-blur-md",
          "dark:border-[color:var(--qp-accent)]/35 dark:bg-[#12121c]/95",
        )}
      >
        {placement === "below" ? (
          <span
            aria-hidden
            className={cn(
              "absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-[color:var(--qp-accent)]/40 bg-card dark:border-[color:var(--qp-accent)]/35 dark:bg-[#12121c]/95",
              arrowX,
            )}
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-1.5 h-3 w-3 rotate-45 border-r border-b border-[color:var(--qp-accent)]/40 bg-card dark:border-[color:var(--qp-accent)]/35 dark:bg-[#12121c]/95",
              arrowX,
            )}
          />
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-tkad-muted transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label={dismissLabel === "Got it" ? "Close" : "닫기"}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
        {illustrationSrc ? (
          <Image
            src={illustrationSrc}
            alt=""
            width={280}
            height={120}
            className="mb-3 w-full rounded-lg object-contain"
            aria-hidden
          />
        ) : null}
        <p className="tkad-type-meta pr-6 font-semibold text-foreground">{title}</p>
        <p className="tkad-type-note mt-1 text-tkad-muted">{description}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="tkad-type-note mt-2.5 font-medium text-[color:var(--qp-accent)]"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
