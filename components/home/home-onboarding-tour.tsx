"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tkad-home-tour-v2";

type TourStep = {
  selector: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
};

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="search"]',
    titleKo: "매체를 검색해보세요",
    titleEn: "Search for media",
    descKo: "매체명·지역·키워드로 빠르게 찾을 수 있어요. ⌘K 단축키도 지원합니다.",
    descEn: "Find placements by name, region, or keyword. ⌘K shortcut supported.",
  },
  {
    selector: '[data-tour="discovery-group"]',
    titleKo: "지도로도 찾을 수 있어요",
    titleEn: "Browse on the map",
    descKo: "발견하기 메뉴에서 지도 검색으로 위치 기반 탐색을 시작해 보세요.",
    descEn: "Open Discover → map search to explore by location.",
  },
  {
    selector: '[data-tour="planning-group"]',
    titleKo: "AI 플래너로 자동 설계",
    titleEn: "Let AI plan for you",
    descKo: "기획하기 → 미디어 플래너에서 예산·목표에 맞는 조합을 추천받으세요.",
    descEn: "Planning → Media planner recommends the best mix for your goals.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const pad = 6;
  return {
    top: Math.max(8, r.top - pad),
    left: Math.max(8, r.left - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

export default function HomeOnboardingTour() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const updateRect = useCallback(() => {
    const stepDef = STEPS[step];
    if (!stepDef) return;
    setTargetRect(measureTarget(stepDef.selector));
  }, [step]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, step, updateRect]);

  const dismissPermanent = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissSession = useCallback(() => {
    setOpen(false);
  }, []);

  if (!open) return null;

  const current = STEPS[step];
  const popupStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        left: "1rem",
        right: "1rem",
        bottom: "6rem",
        width: "auto",
        maxWidth: "24rem",
        marginLeft: "auto",
        marginRight: "auto",
        zIndex: 60,
      }
    : targetRect
      ? {
          position: "fixed",
          top: targetRect.top + targetRect.height + 12,
          left: Math.min(
            Math.max(16, targetRect.left),
            window.innerWidth - Math.min(320, window.innerWidth - 32) - 16,
          ),
          width: "min(24rem, calc(100vw - 2rem))",
          zIndex: 60,
        }
      : {
          position: "fixed",
          right: "1rem",
          bottom: "6rem",
          width: "min(24rem, calc(100vw - 2rem))",
          maxWidth: "24rem",
          zIndex: 60,
        };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
        aria-hidden
        onClick={dismissSession}
      />
      {targetRect ? (
        <div
          className="pointer-events-none fixed z-[45] rounded-xl ring-2 ring-cyan-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        role="dialog"
        aria-label={isKo ? "첫 방문 안내" : "First visit guide"}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/14 dark:bg-gray-900"
        style={popupStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {isKo ? "안내" : "Guide"} · {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            onClick={dismissSession}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-white/60 dark:hover:bg-white/10"
            aria-label={isKo ? "스킵" : "Skip"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
          {isKo ? current.titleKo : current.titleEn}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-white/65">
          {isKo ? current.descKo : current.descEn}
        </p>

        <div className="mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i === step ? "bg-cyan-500" : "bg-gray-200 dark:bg-white/15",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2.5 text-xs font-bold text-white"
            >
              {isKo ? "다음" : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissPermanent}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2.5 text-xs font-bold text-white"
            >
              {isKo ? "시작하기" : "Got it"}
            </button>
          )}
          <button
            type="button"
            onClick={dismissPermanent}
            className="rounded-xl px-3 py-2.5 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            {isKo ? "다시 보지 않기" : "Don't show again"}
          </button>
        </div>
      </div>
    </>
  );
}
