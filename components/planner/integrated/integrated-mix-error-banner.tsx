"use client";

import { AlertTriangle, LogIn, RefreshCw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { IntegratedMixFetchResult } from "@/lib/integrated/client-mix";
import { cn } from "@/lib/utils";

type Props = {
  error: Extract<IntegratedMixFetchResult, { ok: false }>;
  isKo: boolean;
  onRetry?: () => void;
  onContact?: () => void;
  className?: string;
};

const COPY = {
  ko: {
    NEED_LOGIN: {
      title: "로그인이 필요합니다",
      desc: "통합 미디어믹스 무료 체험을 이미 사용하셨어요. 로그인 후 계속 이용할 수 있습니다.",
      login: "로그인",
    },
    RATE_LIMITED: {
      title: "요청이 많습니다",
      desc: "잠시 후 다시 시도해 주세요. (분당 요청 제한)",
      retry: "다시 시도",
    },
    UPSTREAM_UNAVAILABLE: {
      title: "디지털 층 일시 장애",
      desc: "디지털 미디어믹스 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도하거나 상담으로 이어가 주세요.",
      retry: "다시 시도",
      contact: "상담 요청",
    },
    default: {
      title: "통합 믹스를 불러오지 못했습니다",
      desc: "네트워크 또는 일시적 오류입니다. 다시 시도해 주세요.",
      retry: "다시 시도",
    },
  },
  en: {
    NEED_LOGIN: {
      title: "Sign in required",
      desc: "Your free integrated mix trial has been used. Sign in to continue.",
      login: "Sign in",
    },
    RATE_LIMITED: {
      title: "Too many requests",
      desc: "Please wait a moment and try again (rate limit).",
      retry: "Retry",
    },
    UPSTREAM_UNAVAILABLE: {
      title: "Digital layer temporarily unavailable",
      desc: "The digital mix service is temporarily down. Retry shortly or contact us for a package proposal.",
      retry: "Retry",
      contact: "Contact us",
    },
    default: {
      title: "Could not load integrated mix",
      desc: "Network or temporary error. Please try again.",
      retry: "Retry",
    },
  },
} as const;

export function IntegratedMixErrorBanner({
  error,
  isKo,
  onRetry,
  onContact,
  className,
}: Props) {
  const lang = isKo ? "ko" : "en";
  const code = error.error;
  const copy =
    code === "NEED_LOGIN"
      ? COPY[lang].NEED_LOGIN
      : code === "RATE_LIMITED"
        ? COPY[lang].RATE_LIMITED
        : code === "UPSTREAM_UNAVAILABLE"
          ? COPY[lang].UPSTREAM_UNAVAILABLE
          : COPY[lang].default;

  return (
    <div
      role="alert"
      data-testid="integrated-mix-error-banner"
      data-error-code={code}
      className={cn(
        "rounded-2xl border border-amber-400/40 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-bold text-amber-950 dark:text-amber-100">
              {copy.title}
            </p>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
              {copy.desc}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {code === "NEED_LOGIN" ? (
              <BtnBlock href="/login" variant="accent" size="sm">
                <LogIn className="h-3.5 w-3.5" />
                {"login" in copy ? copy.login : "Login"}
              </BtnBlock>
            ) : null}
            {onRetry && code !== "NEED_LOGIN" ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/30 bg-white px-3 py-1.5 tkad-type-title text-amber-950 hover:bg-amber-100 dark:bg-white/5 dark:text-amber-100 dark:hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {"retry" in copy ? copy.retry : "Retry"}
              </button>
            ) : null}
            {code === "UPSTREAM_UNAVAILABLE" && onContact ? (
              <button
                type="button"
                onClick={onContact}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--qp-accent)] px-3 py-1.5 tkad-type-title text-white"
              >
                {"contact" in copy ? copy.contact : "Contact"}
              </button>
            ) : null}
            {code === "UPSTREAM_UNAVAILABLE" && !onContact ? (
              <BtnBlock href="/contact?from=integrated" variant="accent" size="sm">
                {"contact" in copy ? copy.contact : "Contact"}
              </BtnBlock>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
