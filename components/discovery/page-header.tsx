"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DiscoveryPageHeaderProps = {
  /** false면 헤더 블록 미렌더 (앱 셸에서 제목을 숨길 때) */
  showHeader?: boolean;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  /** 필터 상단과 동일한 하단 구분선 */
  bordered?: boolean;
  /** h1(기본) | h2 | h3 — 페이지 vs 섹션 */
  titleAs?: "h1" | "h2" | "h3";
};

export function DiscoveryPageHeader({
  showHeader = true,
  eyebrow,
  title,
  description,
  className,
  bordered = true,
  titleAs = "h1",
}: DiscoveryPageHeaderProps) {
  if (!showHeader || (!eyebrow && !title && !description)) {
    return null;
  }

  const TitleTag = titleAs;

  return (
    <div
      className={cn(
        "space-y-2",
        bordered && "border-b border-gray-100 pb-4 dark:border-white/10",
        className,
      )}
    >
      {eyebrow ? (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <TitleTag className="font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
          {title}
        </TitleTag>
      ) : null}
      {description ? (
        <p className="tkad-type-body text-base leading-relaxed text-tkad-secondary md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
