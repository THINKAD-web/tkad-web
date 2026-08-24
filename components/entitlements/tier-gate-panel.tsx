"use client";

import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TierGateMessage } from "@/lib/entitlements/gate-messages";
import { cn } from "@/lib/utils";

type Props = {
  message: TierGateMessage;
  className?: string;
  compact?: boolean;
};

/** 등급 차이 안내 — 오류 톤이 아닌 자물쇠 + 설명 + CTA */
export function TierGatePanel({ message, className, compact = false }: Props) {
  return (
    <div
      className={cn(
        "tkad-qp-tier-gate mx-auto max-w-sm border border-[color:var(--qp-accent)]/25 bg-[color:var(--qp-accent-soft)] px-6 py-7 text-center dark:border-[color:var(--qp-accent)]/25 dark:bg-[color:var(--qp-accent)]/10",
        compact && "px-5 py-5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Lock
        className="mx-auto h-8 w-8 text-[color:var(--qp-accent)]"
        aria-hidden
      />
      <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--qp-accent)]">
        {message.eyebrow}
      </p>
      <h3
        className={cn(
          "mt-2 font-black text-gray-900 dark:text-white",
          compact ? "text-sm" : "text-base",
        )}
      >
        {message.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/75">
        {message.description}
      </p>
      {message.hint ? (
        <p className="mt-2 text-xs font-medium text-[color:var(--qp-accent)]/90">
          {message.hint}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <TierGateCtaLink cta={message.primaryCta} primary />
        {message.secondaryCta ? (
          <TierGateCtaLink cta={message.secondaryCta} />
        ) : null}
      </div>
    </div>
  );
}

function TierGateCtaLink({
  cta,
  primary = false,
}: {
  cta: TierGateMessage["primaryCta"];
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link
        href={cta.href}
        className="tkad-neon-cta-clean inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--qp-radius-md)] px-5 text-sm font-bold text-gray-900 dark:text-white"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {cta.label}
      </Link>
    );
  }

  return (
    <Link
      href={cta.href}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-50 dark:border-white/14 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      {cta.label}
    </Link>
  );
}

type OverlayProps = {
  message: TierGateMessage;
  children: ReactNode;
  className?: string;
  minHeightClass?: string;
  blurContent?: boolean;
};

/** 블러 배경 + 중앙 TierGatePanel */
export function TierGateOverlay({
  message,
  children,
  className,
  minHeightClass = "min-h-[12rem]",
  blurContent = true,
}: OverlayProps) {
  return (
    <div className={cn("relative", minHeightClass, className)}>
      <div
        className={cn(
          blurContent &&
            "pointer-events-none select-none blur-sm brightness-75 opacity-90",
        )}
        aria-hidden={blurContent}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50 p-4 backdrop-blur-[2px] dark:bg-black/55">
        <TierGatePanel message={message} />
      </div>
    </div>
  );
}

/** 토스트·인라인 — 패널 없이 텍스트만 */
export function TierGateInlineNotice({
  message,
  className,
}: {
  message: TierGateMessage;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/8 px-4 py-3 dark:border-[color:var(--qp-accent)]/30 dark:bg-[color:var(--qp-accent)]/10",
        className,
      )}
      role="status"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {message.title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-white/75">
        {message.description}
      </p>
    </div>
  );
}
