"use client";

import { Sparkles, MapPin, Layers, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuoteSource } from "@/lib/quote/types";

type Props = {
  source: QuoteSource;
  /** 사전 선택된 매체 수. 0 이면 비표시. */
  prefilledMediaCount: number;
  /** Planner 의 plan id 등 — 일부 텍스트에 노출 가능(현재 미사용). */
  sourceId?: string | null;
  /** 사용자가 X 클릭 시 호출. 부모는 source 를 'direct' 로 리셋. */
  onDismiss: () => void;
  className?: string;
};

/** 진입 경로별 안내 배너 — Step 1 상단에 노출. */
export function QuoteSourceBanner({
  source,
  prefilledMediaCount,
  onDismiss,
  className,
}: Props) {
  const t = useTranslations("quote.sourceBanner");

  if (source === "direct" || prefilledMediaCount <= 0) return null;

  const labelKey: "planner" | "media" | "compare" = source;
  const Icon =
    source === "planner" ? Sparkles : source === "media" ? MapPin : Layers;

  return (
    <div
      className={cn(
        "mb-6 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3",
        className,
      )}
      role="status"
    >
      <Icon className="h-5 w-5 shrink-0 text-gold" aria-hidden />
      <p className="grow text-sm text-navy">
        {t(labelKey, { count: prefilledMediaCount })}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="h-8 w-8 p-0 text-navy/60 hover:text-navy"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
