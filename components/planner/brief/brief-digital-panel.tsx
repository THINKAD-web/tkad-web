"use client";

/**
 * O-1 Step 2 디지털 배분 패널 — integrated 훅·추천 로직 재사용.
 * BFF 실측 vs 로컬 벤치마크 폴백을 AllocationSourceBadge 로 구분한다.
 */

import { useMemo } from "react";
import { Check, Loader2, Sparkles, TrendingUp } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { IntegratedMixFetchResult } from "@/lib/integrated/client-mix";
import { mapMixToDigitalRecommendResult } from "@/lib/integrated/map-mix-to-ui";
import {
  defaultDigitalChannelIds,
  recommendDigitalChannels,
  type DigitalRecommendResult,
  type ScoredDigitalChannel,
} from "@/lib/planner/recommend-digital";
import {
  type DigitalChannel,
} from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  briefBudgetMan,
  briefGoalToPlanner,
  briefRegionsForIntegrated,
} from "@/lib/planner/brief/brief-integrated-adapters";
import {
  AllocationSourceBadge,
  type DigitalAllocationSource,
} from "@/components/planner/brief/allocation-source-badge";
import { IntegratedMixErrorBanner } from "@/components/planner/integrated/integrated-mix-error-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  portfolio: MediaItem[];
  isKo: boolean;
  digitalChannels: DigitalChannel[];
  digitalCatalogMeta?: DigitalCatalogBridgeMeta;
  mix: IntegratedMixResponse | null;
  mixLoading: boolean;
  mixError: Extract<IntegratedMixFetchResult, { ok: false }> | null;
  onMixRetry?: () => void;
};

function PlatformCard({
  channel,
  scored,
  active,
  isKo,
  onToggle,
}: {
  channel: DigitalChannel;
  scored?: ScoredDigitalChannel;
  active: boolean;
  isKo: boolean;
  onToggle: () => void;
}) {
  const iconColor = channel.textColor ?? "#ffffff";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative flex w-full flex-col rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border-2",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 bg-transparent",
        )}
      >
        {active ? <Check className="h-2.5 w-2.5" /> : null}
      </span>

      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black"
        style={{ backgroundColor: channel.color, color: iconColor }}
      >
        {channel.icon}
      </span>

      <span className="mt-2 pr-5 text-sm font-semibold">
        {isKo ? channel.nameKo : channel.nameEn}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
        {isKo ? channel.descriptionKo : channel.descriptionEn}
      </span>

      {active && scored ? (
        <span className="mt-2 text-[10px] font-medium tabular-nums text-muted-foreground">
          {isKo ? "추천 비중" : "Share"} {scored.budgetPct}%
          {" · "}
          {isKo ? "월간 노출" : "Monthly impr."}{" "}
          {scored.estimatedImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
        </span>
      ) : null}
    </button>
  );
}

function resolveAllocationSource(params: {
  mix: IntegratedMixResponse | null;
  mixLoading: boolean;
  mixError: Extract<IntegratedMixFetchResult, { ok: false }> | null;
}): DigitalAllocationSource | null {
  if (params.mixLoading) return null;
  if (params.mix && !params.mixError) return "live";
  return "benchmark";
}

export function BriefDigitalPanel({
  portfolio,
  isKo,
  digitalChannels,
  digitalCatalogMeta,
  mix,
  mixLoading,
  mixError,
  onMixRetry,
}: Props) {
  const store = useBriefStore();
  const budgetMan = briefBudgetMan(store);
  const regions = briefRegionsForIntegrated(store.regionCodes);
  const goal = briefGoalToPlanner(store.goal);
  const digitalBudgetPct = store.digitalBudgetPct;
  const selectedIds = store.digitalChannelIds;

  const fallbackResult = useMemo(
    () =>
      recommendDigitalChannels({
        goal,
        regions,
        portfolio,
        budgetMan,
        digitalBudgetPct,
        selectedChannelIds: selectedIds,
        channels: digitalChannels,
      }),
    [
      goal,
      regions,
      portfolio,
      budgetMan,
      digitalBudgetPct,
      selectedIds,
      digitalChannels,
    ],
  );

  const result: DigitalRecommendResult = useMemo(() => {
    if (!mix) return fallbackResult;
    return mapMixToDigitalRecommendResult({
      mix,
      portfolio,
      regions,
      budgetMan,
      selectedChannelIds: selectedIds,
      digitalChannels,
      isKo,
    });
  }, [
    mix,
    fallbackResult,
    portfolio,
    regions,
    budgetMan,
    selectedIds,
    digitalChannels,
    isKo,
  ]);

  const allocationSource = resolveAllocationSource({
    mix,
    mixLoading,
    mixError,
  });

  const scoredById = useMemo(
    () => new Map(result.channels.map((row) => [row.channel.id, row])),
    [result.channels],
  );

  const showHardError =
    mixError != null &&
    mixError.error !== "UPSTREAM_UNAVAILABLE" &&
    mixError.error !== "NETWORK";

  const showBenchmarkNote =
    allocationSource === "benchmark" &&
    (mixError?.error === "UPSTREAM_UNAVAILABLE" ||
      mixError?.error === "NETWORK" ||
      mix == null);

  const handleSelectRecommended = () => {
    const top = [...result.channels]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((c) => c.channel.id);
    store.setDigitalChannelIds(top.length ? top : defaultDigitalChannelIds());
  };

  return (
    <section
      className="mt-8 space-y-4 rounded-xl border border-border bg-muted/20 p-4"
      data-testid="brief-digital-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {isKo ? "디지털 채널 배분" : "Digital channel allocation"}
            </h3>
            {allocationSource ? (
              <AllocationSourceBadge source={allocationSource} isKo={isKo} />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKo
              ? "OOH 믹스와 함께 집행할 디지털 채널과 예산 비중입니다."
              : "Digital channels and budget share to run alongside your OOH mix."}
          </p>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={handleSelectRecommended}
          disabled={mixLoading}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          {isKo ? "추천 4개 선택" : "Select top 4"}
        </Button>
      </div>

      {showHardError && mixError ? (
        <IntegratedMixErrorBanner
          error={mixError}
          isKo={isKo}
          onRetry={onMixRetry}
        />
      ) : null}

      {showBenchmarkNote ? (
        <p
          className="rounded-lg border border-sky-400/30 bg-sky-400/5 px-3 py-2 text-[11px] text-sky-900 dark:text-sky-200"
          data-testid="brief-digital-benchmark-note"
        >
          {isKo
            ? "디지털 API에 연결되지 않아 채널 벤치마크로 배분을 표시합니다. 아래 비중은 참고용입니다."
            : "Digital API is unavailable — showing benchmark-based allocation for reference."}
        </p>
      ) : null}

      {mixLoading ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="brief-digital-mix-loading"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isKo ? "디지털 배분 계산 중…" : "Calculating digital allocation…"}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-start gap-2">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs font-medium leading-relaxed">
            {isKo ? result.synergyMessageKo : result.synergyMessageEn}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold">
          {isKo ? "디지털 예산 비중" : "Digital budget share"}
        </label>
        <input
          type="range"
          min={10}
          max={50}
          step={5}
          value={digitalBudgetPct}
          onChange={(e) => store.setDigitalBudgetPct(Number(e.target.value))}
          disabled={mixLoading}
          className="w-full accent-primary disabled:opacity-50"
        />
        <div className="flex justify-between text-xs font-medium tabular-nums">
          <span>
            OOH {result.oohBudgetPct}% (
            {Math.round(budgetMan * (result.oohBudgetPct / 100)).toLocaleString()}
            {isKo ? "만원" : "M KRW"})
          </span>
          <span className="text-muted-foreground">
            {isKo ? "디지털" : "Digital"} {result.digitalBudgetPct}% (
            {result.totalDigitalBudgetMan.toLocaleString()}
            {isKo ? "만원" : "M KRW"})
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          {isKo
            ? `선택 ${selectedIds.length}개 · 카탈로그: ${digitalCatalogMeta?.source === "live" ? "실측 단가" : "정적 벤치마크"}`
            : `${selectedIds.length} selected · catalog: ${digitalCatalogMeta?.source === "live" ? "live rates" : "static benchmark"}`}
        </p>
        <div
          data-testid="brief-digital-channel-grid"
          data-catalog-source={digitalCatalogMeta?.source ?? "static"}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {digitalChannels.map((channel) => (
            <PlatformCard
              key={channel.id}
              channel={channel}
              scored={scoredById.get(channel.id)}
              active={selectedIds.includes(channel.id)}
              isKo={isKo}
              onToggle={() => store.toggleDigitalChannel(channel.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
