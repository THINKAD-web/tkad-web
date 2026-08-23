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
      <span
        className="inline-block h-4 w-1.5 shrink-0 bg-[color:var(--qp-accent)]"
        aria-hidden
      />
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
      <span className="text-[color:var(--qp-accent)]">AD</span>
    </span>
  );
}

/**
 * 문서 히어로 — PDF qp 톤과 맞춤: ink(#1c1c1f) 블록 + 주황 룰.
 * (구 네온 그라데이션·시안 포인트 제거)
 */
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
  coverLogoUrl,
  clientName,
  clientNameEditable = false,
  onClientNameChange,
  clientNamePlaceholder,
  clientNameAriaLabel = "Client name",
  clientNameSuffix,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  className?: string;
  /** 프리미엄 견적 상단 액센트 띠 */
  topAccent?: "gold" | "none";
  /** 미리보기에서 제목 직접 수정 */
  titleEditable?: boolean;
  onTitleChange?: (value: string) => void;
  titlePlaceholder?: string;
  titleAriaLabel?: string;
  /** 표지 우측 로고 (광고주 브랜드) */
  coverLogoUrl?: string | null;
  clientName?: string;
  clientNameEditable?: boolean;
  onClientNameChange?: (value: string) => void;
  clientNamePlaceholder?: string;
  clientNameAriaLabel?: string;
  /** 비편집 표시 시 접미사 (예: 한국어 「귀중」) */
  clientNameSuffix?: string;
}) {
  const titleClassName =
    "mt-5 w-full text-2xl font-black leading-tight text-white sm:text-3xl";

  return (
    <div
      className={cn(
        "tkad-planner-dark-surface relative bg-[#1c1c1f] px-6 py-7 sm:px-9 sm:py-9",
        className,
      )}
    >
      {topAccent === "gold" ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[color:var(--qp-accent)]"
          aria-hidden
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <ThinkadWordmark className="text-lg sm:text-xl" onDark />
        <div className="flex items-center gap-3">
          {coverLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverLogoUrl}
              alt=""
              className="h-10 w-10 rounded-md border border-white/20 bg-white/10 object-contain p-1 sm:h-12 sm:w-12"
            />
          ) : null}
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {badge}
          </span>
        </div>
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
            "border-0 bg-transparent p-0 placeholder:text-white/45 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/70",
          )}
        />
      ) : (
        <h2 className={titleClassName}>{title}</h2>
      )}
      {subtitle ? (
        <p className="mt-2 text-sm font-medium text-white/85">{subtitle}</p>
      ) : null}
      {clientNameEditable && onClientNameChange ? (
        <input
          type="text"
          value={clientName ?? ""}
          onChange={(e) => onClientNameChange(e.target.value)}
          maxLength={80}
          placeholder={clientNamePlaceholder}
          aria-label={clientNameAriaLabel}
          className="mt-4 w-full max-w-md border-0 border-b border-white/25 bg-transparent p-0 pb-1 text-sm font-medium text-white placeholder:text-white/45 focus:border-[color:var(--qp-accent)] focus:outline-none"
        />
      ) : clientName?.trim() ? (
        <p className="mt-4 text-sm font-semibold text-white">
          {clientName.trim()}
          {clientNameSuffix ? ` ${clientNameSuffix}` : ""}
        </p>
      ) : null}
      <div
        className="mt-5 h-1 w-16 bg-[color:var(--qp-accent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-[color:var(--qp-accent)]"
        aria-hidden
      />
    </div>
  );
}
