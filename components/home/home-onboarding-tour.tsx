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
      className="fixed bottom-24 right-4 z-[48] w-[min(100vw-2rem,320px)] md:bottom-8 md:right-8"
      role="dialog"
      aria-label={isKo ? "첫 방문 안내" : "First visit guide"}
    >
      <div className="rounded-2xl border dark:border-white/14 border-gray-200 bg-[#0a0a12]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
            {isKo ? "안내" : "Guide"}
          </p>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="rounded-lg p-1 dark:text-white text-gray-400 hover:dark:bg-white/10 bg-gray-100"
            aria-label={isKo ? "닫기" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-bold dark:text-white text-gray-900">
          {isKo
            ? "안녕하세요! 처음이시면 안내해드릴까요?"
            : "New here? Quick 3-step tour."}
        </p>

        <div className="mt-4 flex gap-3 rounded-xl border dark:border-white/10 border-gray-200 bg-white/[0.04] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-500/30">
            <Icon className="h-5 w-5 dark:text-white text-gray-900" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold dark:text-white text-gray-900">
              {isKo ? current.titleKo : current.titleEn}
            </p>
            <p className="mt-0.5 text-xs dark:text-white text-gray-500">
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
                i === step ? "bg-cyan-400" : "bg-white/15",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-xl dark:bg-white/10 bg-gray-100 py-2 text-xs font-bold dark:text-white text-gray-900 hover:bg-white/15"
            >
              {isKo ? "다음" : "Next"}
            </button>
          ) : (
            <Link
              href={current.href}
              onClick={() => dismiss(true)}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2 text-center text-xs font-bold dark:text-white text-gray-900"
            >
              {isKo ? "시작하기" : "Start"}
            </Link>
          )}
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="rounded-xl border dark:border-white/14 border-gray-200 px-3 py-2 text-xs font-semibold dark:text-white text-gray-700"
          >
            {isKo ? "스킵" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
