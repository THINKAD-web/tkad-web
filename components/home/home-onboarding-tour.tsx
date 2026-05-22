"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Compass, GitCompare, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tkad-home-tour-v1";

const STEPS = [
  {
    icon: Compass,
    titleKo: "매체 검색",
    titleEn: "Browse media",
    descKo: "지역·유형·예산으로 검증 매체를 찾아보세요.",
    descEn: "Filter verified placements by region, type, and budget.",
    href: "/media",
  },
  {
    icon: GitCompare,
    titleKo: "비교",
    titleEn: "Compare",
    descKo: "후보 매체를 나란히 비교해 최적 조합을 고르세요.",
    descEn: "Compare candidates side by side.",
    href: "/compare",
  },
  {
    icon: MessageSquare,
    titleKo: "견적 요청",
    titleEn: "Get a quote",
    descKo: "3분 안에 견적·상담을 요청할 수 있습니다.",
    descEn: "Request a quote in minutes.",
    href: "/quote",
  },
] as const;

export default function HomeOnboardingTour() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = useCallback((permanent: boolean) => {
    setOpen(false);
    if (permanent) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      className="fixed bottom-20 left-1/2 z-[45] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:bottom-8 md:left-auto md:right-8 md:w-[min(100vw-2rem,320px)] md:translate-x-0"
      role="dialog"
      aria-label={isKo ? "첫 방문 안내" : "First visit guide"}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/14 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 dark:text-white">
            {isKo ? "안내" : "Guide"}
          </p>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-white/60 dark:hover:bg-white/10"
            aria-label={isKo ? "닫기" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
          {isKo
            ? "안녕하세요! 처음이시면 안내해드릴까요?"
            : "New here? Quick 3-step tour."}
        </p>

        <div className="mt-4 flex gap-3 rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-white/10 dark:bg-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-500/30">
            <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {isKo ? current.titleKo : current.titleEn}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-white/60">
              {isKo ? current.descKo : current.descEn}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i === step ? "bg-cyan-600 dark:bg-cyan-400" : "bg-gray-200 dark:bg-white/15",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              {isKo ? "다음" : "Next"}
            </button>
          ) : (
            <Link
              href={current.href}
              onClick={() => dismiss(true)}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2 text-center text-xs font-bold text-white"
            >
              {isKo ? "시작하기" : "Start"}
            </Link>
          )}
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/14 dark:bg-white/10 dark:text-white"
          >
            {isKo ? "스킵" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
