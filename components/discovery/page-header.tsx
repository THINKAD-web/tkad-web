"use client";

import type { ReactNode } from "react";
import { PlannerNeonLabel } from "@/components/planner/planner-neon-ui";
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
      {eyebrow ? <PlannerNeonLabel>{eyebrow}</PlannerNeonLabel> : null}
      {title ? (
        <TitleTag className="tkad-type-display text-foreground">{title}</TitleTag>
      ) : null}
      {description ? (
        <p className="tkad-type-body text-tkad-secondary">{description}</p>
      ) : null}
    </div>
  );
}
