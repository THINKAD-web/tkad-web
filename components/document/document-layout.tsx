"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 플래너·견적 미리보기 바깥 프레임 (회색 패딩 영역) */
export const documentPreviewFrameClass =
  "w-full min-w-0 rounded-2xl border border-gray-200 bg-gray-100 p-2 dark:border-white/10 dark:bg-white/[0.03] sm:p-5 lg:p-7";

/** 플래너·견적 문서 카드 (흰색 A4/보고서 본문) — min-w-0 + overflow-x-auto 로 내부 테이블 자체 스크롤 */
export const documentCardClass =
  "tkad-document-light-surface mx-auto w-full min-w-0 max-w-[880px] overflow-x-auto rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-200 dark:bg-white dark:text-gray-900";

export function DocumentPreviewFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(documentPreviewFrameClass, className)}>{children}</div>;
}

export function DocumentSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "flex items-center gap-2 text-base font-semibold tracking-normal text-gray-900",
        className,
      )}
    >
      <span className="inline-block h-4 w-1.5 rounded-full bg-violet-600" aria-hidden />
      {children}
    </h3>
  );
}

export function ThinkadWordmark({
  className,
  onDark = true,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-black tracking-tight",
        className,
      )}
    >
      <span className={onDark ? "text-white" : "text-gray-900"}>THINK</span>
      <span className="text-cyan-400">AD</span>
    </span>
  );
}

export function DocumentGradientHero({
  badge,
  title,
  subtitle,
  className,
  topAccent,
  titleEditable = false,
  onTitleChange,
  titlePlaceholder,
  titleAriaLabel = "Report title",
}: {
  badge: string;
  title: string;
  subtitle?: string;
  className?: string;
  /** 프리미엄 견적 상단 골드 띠 */
  topAccent?: "gold" | "none";
  /** 미리보기에서 제목 직접 수정 */
  titleEditable?: boolean;
  onTitleChange?: (value: string) => void;
  titlePlaceholder?: string;
  titleAriaLabel?: string;
}) {
  const titleClassName =
    "mt-5 w-full text-2xl font-black leading-tight text-white sm:text-3xl [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]";

  return (
    <div
      className={cn(
        "tkad-planner-dark-surface relative bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 px-6 py-7 sm:px-9 sm:py-9",
        className,
      )}
    >
      {topAccent === "gold" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-amber-400" aria-hidden />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <ThinkadWordmark className="text-lg sm:text-xl" onDark />
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200">
          {badge}
        </span>
      </div>
      {titleEditable && onTitleChange ? (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={120}
          placeholder={titlePlaceholder}
          aria-label={titleAriaLabel}
          className={cn(
            titleClassName,
            "border-0 bg-transparent p-0 placeholder:text-white/45 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400/70",
          )}
        />
      ) : (
        <h2 className={titleClassName}>{title}</h2>
      )}
      {subtitle ? (
        <p className="mt-2 text-sm font-medium text-white/90">{subtitle}</p>
      ) : null}
      <div className="mt-5 h-1 w-16 rounded-full bg-cyan-400" aria-hidden />
    </div>
  );
}
