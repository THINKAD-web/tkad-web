"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Sparkles, TrendingUp } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { IntegratedMixFetchResult } from "@/lib/integrated/client-mix";
import {
  defaultDigitalChannelIds,
  recommendDigitalChannels,
  type DigitalRecommendResult,
  type ScoredDigitalChannel,
} from "@/lib/planner/recommend-digital";
import {
  type DigitalChannel,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge";
import { mapMixToDigitalRecommendResult } from "@/lib/integrated/map-mix-to-ui";
import {
  selectIntegratedBudgetNum,
  useIntegratedPlannerStore,
} from "@/lib/planner/integrated-store";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { IntegratedMixErrorBanner } from "@/components/planner/integrated/integrated-mix-error-banner";
import { IntegratedMixKpiStrip } from "@/components/planner/integrated/integrated-mix-kpi-strip";
import { extractMixKpiView } from "@/lib/integrated/map-mix-to-ui";
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
  onMixContact?: () => void;
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
        "relative flex w-full flex-col rounded-2xl border p-4 text-left transition-transform",
        "hover:scale-[1.02] active:scale-[0.98]",
        active
          ? "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent)]/10 ring-2 ring-[color:var(--qp-accent-ring)]"
          : "border-gray-200 bg-white dark:border-white/10 dark:bg-white/5",
      )}
    >
      <span
        className={cn(
          "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2",
          active
            ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)] text-white"
            : "border-gray-300 bg-transparent dark:border-white/20",
        )}
      >
        {active ? <Check className="h-3 w-3" /> : null}
      </span>

      {channel.badge ? (
        <span className="absolute left-3 top-3 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
          {channel.badge}
        </span>
      ) : null}

      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black"
        style={{ backgroundColor: channel.color, color: iconColor }}
      >
        {channel.icon}
      </span>

      <span className="mt-3 pr-6 text-sm font-bold text-gray-900 dark:text-white">
        {isKo ? channel.nameKo : channel.nameEn}
      </span>
      <span className="mt-1 text-xs text-gray-500 dark:text-white/50">
        {isKo ? channel.descriptionKo : channel.descriptionEn}
      </span>
      <span className="mt-2 text-xs font-medium text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
        {isKo ? channel.synergyKo : channel.synergyEn}
      </span>

      {active && scored ? (
        <span className="mt-2 text-[11px] font-semibold text-[color:var(--qp-fg-muted)] dark:text-[color:var(--qp-fg-muted)]">
          {isKo ? "추천 비중" : "Suggested share"} {scored.budgetPct}%
          {" · "}
          {isKo ? "월간 노출 (추정)" : "Monthly impressions (est.)"}{" "}
          {scored.estimatedImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
        </span>
      ) : null}
    </button>
  );
}

export function IntegratedDigitalRecommendationPanel({
  portfolio,
  isKo,
  digitalChannels,
  digitalCatalogMeta,
  mix,
  mixLoading,
  mixError,
  onMixRetry,
  onMixContact,
}: Props) {
  const t = useTranslations("plannerIntegrated");
  const goal = useIntegratedPlannerStore((s) => s.campaignGoal);
  const regions = useIntegratedPlannerStore((s) => s.regions);
  const budgetMan = useIntegratedPlannerStore(selectIntegratedBudgetNum);
  const digitalBudgetPct = useIntegratedPlannerStore((s) => s.digitalBudgetPct);
  const setDigitalBudgetPct = useIntegratedPlannerStore(
    (s) => s.setDigitalBudgetPct,
  );
  const selectedIds = useIntegratedPlannerStore((s) => s.digitalChannelIds);
  const toggleChannel = useIntegratedPlannerStore((s) => s.toggleDigitalChannel);
  const setDigitalChannelIds = useIntegratedPlannerStore(
    (s) => s.setDigitalChannelIds,
  );

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
    [goal, regions, portfolio, budgetMan, digitalBudgetPct, selectedIds, digitalChannels],
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

  const scoredById = useMemo(
    () => new Map(result.channels.map((row) => [row.channel.id, row])),
    [result.channels],
  );

  const isSelected = (id: DigitalChannelId) => selectedIds.includes(id);

  const handleSelectRecommended = () => {
    const top = [...result.channels]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((c) => c.channel.id);
    setDigitalChannelIds(top.length ? top : defaultDigitalChannelIds());
  };

  const mixKpis = mix ? extractMixKpiView(mix) : null;

  return (
    <div className="space-y-6">
      {mixError ? (
        <IntegratedMixErrorBanner
          error={mixError}
          isKo={isKo}
          onRetry={onMixRetry}
          onContact={onMixContact}
        />
      ) : null}

      {mixLoading ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-[color:var(--qp-line)] bg-white/50 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5"
          data-testid="integrated-mix-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("mixLoading")}
        </div>
      ) : null}

      {mixKpis ? <IntegratedMixKpiStrip kpis={mixKpis} isKo={isKo} /> : null}

      <div className="rounded-2xl border border-[color:var(--qp-line)] bg-[color:var(--qp-accent-soft)] p-5 sm:p-6 dark:border-[color:var(--qp-accent)]/30 dark:bg-[color:var(--qp-accent)]/10">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--qp-accent)]" />
          <div>
            <p className="text-sm font-bold leading-relaxed text-gray-950 dark:text-[color:var(--qp-accent)]">
              {isKo ? result.synergyMessageKo : result.synergyMessageEn}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-white/70">
              {t("synergyHint")}
            </p>
          </div>
        </div>
      </div>

      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>{t("digitalBudgetSplit")}</PlannerNeonLabel>
          <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
            {t("digitalBudgetSplitDesc")}
          </p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={digitalBudgetPct}
            onChange={(e) => setDigitalBudgetPct(Number(e.target.value))}
            disabled={mixLoading}
            className="w-full accent-[color:var(--qp-accent)] disabled:opacity-50"
          />
          <div className="flex justify-between text-sm font-semibold">
            <span>
              OOH {result.oohBudgetPct}% (
              {Math.round(budgetMan * (result.oohBudgetPct / 100)).toLocaleString()}
              {isKo ? "만원" : "M KRW"})
            </span>
            <span className="text-[color:var(--qp-fg-muted)]">
              {t("digitalLabel")} {result.digitalBudgetPct}% (
              {result.totalDigitalBudgetMan.toLocaleString()}
              {isKo ? "만원" : "M KRW"})
            </span>
          </div>
        </div>
      </PlannerNeonCard>

      <PlannerNeonCard className="border-[color:var(--qp-accent)]/20">
        <div className="flex flex-col gap-3 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="space-y-1">
            <PlannerNeonLabel>{t("digitalRecommendEyebrow")}</PlannerNeonLabel>
            <h3 className={cn("text-lg font-bold", plannerNeon.headline)}>
              {t("digitalRecommendTitle")}
            </h3>
            <p className={cn("text-sm", plannerNeon.subtext)}>
              {t("digitalRecommendDesc", {
                region: isKo
                  ? result.primaryRegionLabelKo
                  : result.primaryRegionLabelEn,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {isKo
                ? `선택 ${selectedIds.length}개 · 보고서에는 선택한 플랫폼만 포함됩니다`
                : `${selectedIds.length} selected · report includes chosen platforms only`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectRecommended}
            disabled={mixLoading}
            className={cn(
              plannerNeon.selectChip,
              plannerNeon.selectChipIdle,
              "shrink-0 self-start disabled:opacity-50",
            )}
          >
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
            {isKo ? "AI 추천 4개 선택" : "Select top 4 (AI)"}
          </button>
        </div>

        <div
          data-testid="integrated-digital-channel-grid"
          data-catalog-source={digitalCatalogMeta?.source ?? "static"}
          className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:p-6 md:grid-cols-3"
        >
          {digitalChannels.map((channel) => (
            <PlatformCard
              key={channel.id}
              channel={channel}
              scored={scoredById.get(channel.id)}
              active={isSelected(channel.id)}
              isKo={isKo}
              onToggle={() => toggleChannel(channel.id)}
            />
          ))}
        </div>
      </PlannerNeonCard>
    </div>
  );
}
