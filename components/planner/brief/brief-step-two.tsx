"use client";

/**
 * PR-6b Step 2 · 믹스 편집.
 *
 * 좌: 추천 매체 카드 (3축 점수 + 근거)
 * 우: 실시간 지표 패널 (추가·제거·수량 변경 시 즉시 재계산)
 *
 * 성별·연령 demo 스냅샷(PR-3 Phase 3)으로 타깃 축을 계산한다.
 */

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import type { DigitalChannel } from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge-types";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  BRIEF_DEFAULT_DAYS,
  flightDays,
  totalBudgetWon,
} from "@/lib/planner/brief/types";
import { buildBriefIntegratedMixRequest } from "@/lib/planner/brief/brief-integrated-adapters";
import { useIntegratedMix } from "@/hooks/use-integrated-mix";
import {
  regionOverInclusions,
  overInclusionMessage,
  filterBriefCatalogByRegion,
} from "@/lib/planner/brief/regions";
import { calcMixMetrics, type MixLine } from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import { scoreMediaCandidates } from "@/lib/planner/brief/scoring";
import { rebuildBriefRecommendedMix } from "@/lib/planner/brief/rebuild-mix";
import { partitionScoredByBudget } from "@/lib/planner/brief/budget-ranking";
import { BudgetFilterBar } from "@/components/planner/brief/budget-filter-bar";
import { MetricsPanel } from "@/components/planner/brief/metrics-panel";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";
import { BriefDigitalPanel } from "@/components/planner/brief/brief-digital-panel";
import { BriefMediaCard } from "@/components/planner/brief/brief-media-card";
import { isPublicQuoteWizardSelectableMedia } from "@/lib/pricing-unavailable";
import { BriefCustomLineCard } from "@/components/planner/brief/brief-custom-line-card";
import { BriefCustomLineForm } from "@/components/planner/brief/brief-custom-line-form";
import { OverBudgetChoicePanel } from "@/components/planner/brief/over-budget-choice-panel";
import { resolveOverBudgetChoice } from "@/lib/planner/brief/over-budget-options";
import {
  applyCustomLinesToMixMetrics,
  hasBriefMixContent,
} from "@/lib/planner/brief/custom-mix-metrics";

export function BriefStepTwo({
  catalog,
  digitalChannels = [],
  digitalCatalogMeta,
}: {
  catalog: readonly MediaItem[];
  digitalChannels?: readonly DigitalChannel[];
  digitalCatalogMeta?: DigitalCatalogBridgeMeta;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const store = useBriefStore();
  const localeKey = isKo ? "ko" : "en";
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [editingCustomLineId, setEditingCustomLineId] = useState<string | null>(
    null,
  );

  const days = flightDays(store) ?? BRIEF_DEFAULT_DAYS;
  const budgetWon = totalBudgetWon(store);
  const showDigital = store.channelMode === "ooh_digital";
  const customLines = store.customLines;
  const hasMix = hasBriefMixContent(store.mixUnits, customLines);

  const selectableCatalog = useMemo(
    () => catalog.filter(isPublicQuoteWizardSelectableMedia),
    [catalog],
  );

  const candidates = useMemo(
    () => filterBriefCatalogByRegion(selectableCatalog, store.regionCodes),
    [selectableCatalog, store.regionCodes],
  );

  const scored = useMemo(
    () =>
      scoreMediaCandidates({
        candidates,
        brief: store,
        days,
        isKo,
      }),
    [candidates, store, days, isKo],
  );

  const budgetPartition = useMemo(
    () =>
      partitionScoredByBudget({
        scored,
        budgetWithinOnly: store.budgetWithinOnly,
      }),
    [scored, store.budgetWithinOnly],
  );

  const visibleScored = budgetPartition.visible;

  const lines: MixLine[] = useMemo(() => {
    const out: MixLine[] = [];
    for (const [mediaId, units] of Object.entries(store.mixUnits)) {
      const media = catalog.find((m) => m.id === mediaId);
      if (media && units > 0) out.push({ media, units });
    }
    return out;
  }, [catalog, store.mixUnits]);

  const catalogMetrics = useMemo(
    () =>
      calcMixMetrics({
        lines,
        days,
        budgetWon,
        target: briefToTargetSpec(store),
      }),
    [lines, days, budgetWon, store.genders, store.ageBands],
  );

  const metrics = useMemo(
    () => applyCustomLinesToMixMetrics(catalogMetrics, customLines),
    [catalogMetrics, customLines],
  );

  const overIncl = useMemo(
    () => regionOverInclusions(store.regionCodes),
    [store.regionCodes],
  );

  const portfolio = useMemo(
    () =>
      lines.map((l) => l.media).filter((m): m is MediaItem => m != null),
    [lines],
  );

  const selectedOohIds = useMemo(
    () => Object.keys(store.mixUnits).filter((id) => store.mixUnits[id]! > 0),
    [store.mixUnits],
  );

  const mixRequest = useMemo(
    () =>
      showDigital
        ? buildBriefIntegratedMixRequest({
            brief: store,
            digitalBudgetPct: store.digitalBudgetPct,
            selectedOohMediaIds: selectedOohIds,
            locale: localeKey,
          })
        : null,
    [showDigital, store, selectedOohIds, localeKey],
  );

  const mixEnabled = showDigital && mixRequest != null;

  const {
    data: mixResult,
    loading: mixLoading,
    error: mixError,
    refetch: refetchMix,
  } = useIntegratedMix(mixRequest, mixEnabled);

  const overBudgetChoice = useMemo(() => {
    if (budgetWon <= 0 || lines.length === 0) return null;
    return resolveOverBudgetChoice({
      brief: store,
      catalog,
      mixUnits: store.mixUnits,
      isKo,
    });
  }, [budgetWon, lines.length, store, catalog, isKo, store.mixUnits]);

  const showOverBudgetPanel =
    overBudgetChoice != null && !store.overBudgetChoiceDismissed;

  const mixItemCount = lines.length + customLines.length;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── 좌: 추천 리스트 ── */}
      <div className="min-w-0 max-w-full">
        {overIncl.length > 0 ? (
          <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5">
            {overIncl.map((row) => (
              <p
                key={row.browseMainId}
                className="tkad-type-caption leading-relaxed text-amber-800 dark:text-amber-300"
              >
                {overInclusionMessage(row, isKo)}
              </p>
            ))}
          </div>
        ) : null}

        {store.genders.length > 0 || store.ageBands.length > 0 ? (
          <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 tkad-type-caption text-muted-foreground">
            <span>
              {isKo
                ? "성별·연령은 매체 유형·등록 정보 기반 추정치입니다."
                : "Gender and age use type-based or registered-text estimates."}
            </span>
            <DataQualityBadge basis="default" isKo={isKo} />
          </p>
        ) : null}

        {budgetWon > 0 ? (
          <BudgetFilterBar
            isKo={isKo}
            budgetWithinOnly={store.budgetWithinOnly}
            onToggle={store.setBudgetWithinOnly}
            hiddenOverBudgetCount={budgetPartition.hiddenOverBudgetCount}
            withinBudgetCount={budgetPartition.withinBudgetCount}
          />
        ) : null}

        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="tkad-type-title">
            {isKo
              ? `추천 매체 ${visibleScored.length}개`
              : `${visibleScored.length} recommended media`}
          </h3>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              store.replaceMix(
                rebuildBriefRecommendedMix({
                  brief: store,
                  catalog,
                  isKo,
                  preserveMixUnits: store.mixUnits,
                }),
              )
            }
          >
            {isKo ? "예산 내 자동 구성" : "Auto-fill within budget"}
          </Button>
        </div>

        <ul className="space-y-2">
          {visibleScored.slice(0, 30).map((s) => (
            <BriefMediaCard
              key={s.media.id}
              scored={s}
              units={store.mixUnits[s.media.id] ?? 0}
              isKo={isKo}
              days={days}
              onAdd={() => store.addMediaToMix(s.media.id, 1)}
              onRemove={() => store.removeMediaFromMix(s.media.id)}
              onUnits={(n) => store.setMixUnits(s.media.id, n)}
              testIdPrefix="brief-mix-card"
            />
          ))}
        </ul>
        {visibleScored.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {isKo
              ? "조건에 맞는 매체가 없습니다. 지역 조건을 넓혀 보세요."
              : "No media match. Try widening the region filter."}
          </p>
        ) : null}

        {showDigital ? (
          <BriefDigitalPanel
            portfolio={portfolio.length > 0 ? portfolio : catalog.slice(0, 3)}
            isKo={isKo}
            digitalChannels={[...digitalChannels]}
            digitalCatalogMeta={digitalCatalogMeta}
            mix={mixResult}
            mixLoading={mixLoading}
            mixError={mixError}
            onMixRetry={refetchMix}
          />
        ) : null}
      </div>

      {/* ── 우: 지표 패널 ── */}
      <div className="min-w-0 max-w-full lg:sticky lg:top-4 lg:self-start">
        {showOverBudgetPanel && overBudgetChoice ? (
          <OverBudgetChoicePanel
            choice={overBudgetChoice}
            isKo={isKo}
            onApplyOptionA={() =>
              store.applyOverBudgetOptionA(overBudgetChoice.optionA.mixLines)
            }
            onKeepCurrentMix={() => store.dismissOverBudgetChoice()}
            onRestorePreviousMix={() => store.restoreMixBeforeOptionA()}
            canRestorePreviousMix={store.mixUndoBeforeOptionA != null}
          />
        ) : null}

        <MetricsPanel
          metrics={metrics}
          isKo={isKo}
          customLineCount={customLines.length}
        />

        <div
          className="mt-3 rounded-xl border border-border bg-card p-3"
          data-testid="brief-mix-list"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="tkad-type-title">
              {isKo
                ? `믹스 ${mixItemCount}건`
                : `${mixItemCount} mix item(s)`}
            </p>
            {!showAddCustomForm ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setEditingCustomLineId(null);
                  setShowAddCustomForm(true);
                }}
                data-testid="brief-custom-line-add-open"
              >
                {isKo ? "+ 커스텀 항목" : "+ Custom line"}
              </Button>
            ) : null}
          </div>

          {showAddCustomForm ? (
            <div className="mb-3">
              <BriefCustomLineForm
                isKo={isKo}
                mode="add"
                onSubmit={(values) => {
                  store.addCustomLine({
                    name: values.name,
                    quantity: values.quantity,
                    unitPriceWon: values.unitPriceWon,
                    notes: values.notes || undefined,
                  });
                  setShowAddCustomForm(false);
                }}
                onCancel={() => setShowAddCustomForm(false)}
              />
            </div>
          ) : null}

          {!hasMix ? (
            <p className="tkad-type-caption text-muted-foreground">
              {isKo
                ? "카탈로그 매체를 추가하거나 커스텀 항목을 등록하면 지표가 갱신됩니다."
                : "Add catalog media or a custom line to update metrics."}
            </p>
          ) : (
            <ul className="space-y-2">
              {metrics.lines.map((l) => {
                const media = catalog.find((m) => m.id === l.mediaId);
                return (
                  <li
                    key={l.mediaId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-2 py-1.5 tkad-type-caption"
                    data-testid="brief-mix-catalog-row"
                  >
                    <span className="truncate">
                      {media
                        ? isKo
                          ? media.name
                          : media.nameEn || media.name
                        : l.mediaId}
                      <span className="text-muted-foreground"> ×{l.units}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 tabular-nums">
                      {l.costWon
                        ? `₩${l.costWon.value.toLocaleString()}`
                        : isKo
                          ? "금액 미해석"
                          : "no price"}
                      <DataQualityBadge
                        basis={l.costWon?.basis ?? null}
                        isKo={isKo}
                      />
                    </span>
                  </li>
                );
              })}
              {customLines.map((line) => (
                <BriefCustomLineCard
                  key={line.lineId}
                  line={line}
                  isKo={isKo}
                  isEditing={editingCustomLineId === line.lineId}
                  onEdit={() => {
                    setShowAddCustomForm(false);
                    setEditingCustomLineId(line.lineId);
                  }}
                  onRemove={() => {
                    store.removeCustomLine(line.lineId);
                    if (editingCustomLineId === line.lineId) {
                      setEditingCustomLineId(null);
                    }
                  }}
                  onSaveEdit={(values) => {
                    store.updateCustomLine(line.lineId, {
                      name: values.name,
                      quantity: values.quantity,
                      unitPriceWon: values.unitPriceWon,
                      notes: values.notes || undefined,
                    });
                    setEditingCustomLineId(null);
                  }}
                  onCancelEdit={() => setEditingCustomLineId(null)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => store.setWizardStep(1)}
          >
            {isKo ? "← 브리프" : "← Brief"}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!hasMix}
            onClick={() => store.setWizardStep(3)}
            data-testid="brief-step-two-next"
          >
            {isKo ? "결과 보기" : "See result"}
          </Button>
        </div>
      </div>
    </div>
  );
}
