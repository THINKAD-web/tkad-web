"use client";

import { ChevronLeft, ChevronRight, Map } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HOW_TO_USE_STEPS } from "@/lib/guide-how-to-use-content";
import { openHomeOnboardingTour } from "@/lib/home-tour";
import { cn } from "@/lib/utils";
import { headerChromeMenuItemClass } from "@/components/public-chrome/header-chrome-buttons";

const usageStepLinkClass = cn(
  headerChromeMenuItemClass,
  "gap-2 py-2 pl-3 pr-2 tkad-type-body font-normal",
);

type Props = {
  isKo: boolean;
  onClose: () => void;
  onBack: () => void;
  /** 드롭다운 상단 «뒤로» 라벨 옆 제목 */
  title: string;
};

/** 헤더 더보기 메뉴 — 사용법 서브패널 (단계별 기능 페이지 + 전체 가이드) */
export function HeaderUsageGuideMenuPanel({
  isKo,
  onClose,
  onBack,
  title,
}: Props) {
  return (
    <div className="py-1">
      <button
        type="button"
        onClick={onBack}
        className={cn(headerChromeMenuItemClass, "text-muted-foreground")}
      >
        <ChevronLeft className="h-4 w-4 opacity-70" />
        {isKo ? "뒤로" : "Back"}
      </button>
      <p className="px-3 pb-1 pt-0.5 font-display tkad-type-note font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <Link
        href="/guide/how-to-use"
        onClick={onClose}
        className={cn(usageStepLinkClass, "font-semibold text-foreground")}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 tkad-type-caption font-bold text-accent">
          ★
        </span>
        <span className="min-w-0 flex-1">
          {isKo ? "사용법 가이드 전체 보기" : "Full how-to guide"}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
      </Link>
      <div className="my-1 border-t border-gray-100 dark:border-white/10" />
      {HOW_TO_USE_STEPS.map((step) => (
        <Link
          key={step.step}
          href={step.href}
          onClick={onClose}
          className={usageStepLinkClass}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted tkad-type-note font-bold tabular-nums text-muted-foreground"
            aria-hidden
          >
            {step.step}
          </span>
          <span className="min-w-0 flex-1 leading-snug">
            {isKo ? step.titleKo : step.titleEn}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
        </Link>
      ))}
      <div className="my-1 border-t border-gray-100 dark:border-white/10" />
      <button
        type="button"
        onClick={() => {
          openHomeOnboardingTour();
          onClose();
        }}
        className={usageStepLinkClass}
      >
        <Map className="h-4 w-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1">
          {isKo ? "화면 투어 (온보딩)" : "Screen tour"}
        </span>
      </button>
    </div>
  );
}
