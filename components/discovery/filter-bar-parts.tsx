"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** `/media`·`/media/map` 등 — 결과 수 + 선택/담기/비교 요약 행 */
export type DiscoveryResultSummaryProps = {
  resultLabel?: string | null;
  showResultCount?: boolean;
  isKo?: boolean;
  selectedCount?: number;
  selectionVariant?: "default" | "plan";
  onSelectedSummaryClick?: () => void;
  cartCount?: number;
  compareCount?: number;
  className?: string;
  trailing?: ReactNode;
};

export function DiscoveryResultSummary({
  resultLabel,
  showResultCount = true,
  isKo = true,
  selectedCount = 0,
  selectionVariant = "default",
  onSelectedSummaryClick,
  cartCount = 0,
  compareCount = 0,
  className,
  trailing,
}: DiscoveryResultSummaryProps) {
  const showRow =
    (showResultCount && resultLabel) ||
    selectedCount > 0 ||
    cartCount > 0 ||
    compareCount > 0 ||
    trailing;

  if (!showRow) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      {showResultCount && resultLabel ? (
        <p className="tkad-type-meta text-tkad-muted">{resultLabel}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          onSelectedSummaryClick ? (
            <button
              type="button"
              onClick={onSelectedSummaryClick}
              className="tkad-type-meta font-medium text-tkad-accent underline decoration-tkad-accent/50 underline-offset-2 hover:opacity-90"
            >
              {selectionVariant === "plan"
                ? isKo
                  ? `선택됨 ${selectedCount}개 · 보기`
                  : `${selectedCount} selected · view`
                : isKo
                  ? `선택 ${selectedCount} · 보기`
                  : `${selectedCount} selected · view`}
            </button>
          ) : (
            <span className="tkad-type-meta font-medium text-tkad-accent">
              {selectionVariant === "plan"
                ? isKo
                  ? `선택됨 ${selectedCount}개`
                  : `${selectedCount} selected`
                : isKo
                  ? `선택 ${selectedCount}`
                  : `${selectedCount} selected`}
            </span>
          )
        ) : null}
        {cartCount > 0 ? (
          <span className="tkad-type-meta tkad-home-accent-text font-medium">
            {isKo ? `담김 ${cartCount}` : `${cartCount} in cart`}
          </span>
        ) : null}
        {compareCount > 0 ? (
          <span className="tkad-type-meta font-medium text-foreground">
            {isKo ? `비교 ${compareCount}` : `${compareCount} compare`}
          </span>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}

/** 모바일 필터 바텀시트 상단 */
export type DiscoveryFilterSheetHeaderProps = {
  isKo?: boolean;
  activeFilterCount?: number;
  onClose: () => void;
  title?: string;
};

export function DiscoveryFilterSheetHeader({
  isKo = true,
  activeFilterCount = 0,
  onClose,
  title,
}: DiscoveryFilterSheetHeaderProps) {
  const label = title ?? (isKo ? "필터" : "Filters");

  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
      <p className="tkad-type-title text-foreground">
        {label}
        {activeFilterCount > 0 ? (
          <span className="tkad-type-meta ml-1.5 font-semibold text-tkad-accent">
            {activeFilterCount}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label={isKo ? "닫기" : "Close"}
      >
        <X className="h-5 w-5 text-tkad-muted" aria-hidden />
      </button>
    </div>
  );
}

/** 목록·지도 공통 빈 상태 */
export type DiscoveryEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: "inline" | "panel";
};

export function DiscoveryEmptyState({
  icon = "🔍",
  title,
  description,
  action,
  className,
  variant = "inline",
}: DiscoveryEmptyStateProps) {
  if (variant === "panel") {
    return (
      <div
        className={cn(
          "flex min-h-[24rem] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-white/5",
          className,
        )}
      >
        {typeof icon === "string" ? (
          <p className="text-4xl" aria-hidden>
            {icon}
          </p>
        ) : (
          icon
        )}
        <p className="tkad-type-title text-foreground">{title}</p>
        {description ? (
          <p className="tkad-type-body text-tkad-secondary">{description}</p>
        ) : null}
        {action}
      </div>
    );
  }

  return (
    <div className={cn("col-span-full py-16 text-center", className)}>
      {typeof icon === "string" ? (
        <p className="mb-3 text-4xl" aria-hidden>
          {icon}
        </p>
      ) : (
        <div className="mb-3">{icon}</div>
      )}
      <p className="tkad-type-title mb-1 text-tkad-muted">{title}</p>
      {description ? (
        <p className="tkad-type-note mb-4 text-tkad-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

/** `/media/map` — 현재 화면 vs 전국 결과 수 라벨 */
export function formatMapViewCountLabel(
  resultCount: number,
  total: number | undefined,
  isKo: boolean,
): string {
  if (total != null && total > resultCount) {
    return isKo
      ? `현재 화면 ${resultCount} / 전국 ${total}개`
      : `${resultCount} in current view / ${total} nationwide`;
  }
  return isKo ? `전국 ${resultCount}개` : `${resultCount} nationwide`;
}
