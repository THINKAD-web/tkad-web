"use client";

/**
 * PR-6b Step 2 · 믹스 편집.
 *
 * 좌: 추천 매체 카드 (3축 점수 + 근거)
 * 우: 실시간 지표 패널 (추가·제거·수량 변경 시 즉시 재계산)
 *
 * 성별·연령 demo 스냅샷(PR-3 Phase 3)으로 타깃 축을 계산한다.
 */

import { useMemo } from "react";
import { useLocale } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import type { DigitalChannel } from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/planner/brief/store";
import { flightDays, totalBudgetWon } from "@/lib/planner/brief/types";
import { buildBriefIntegratedMixRequest } from "@/lib/planner/brief/brief-integrated-adapters";
import { useIntegratedMix } from "@/hooks/use-integrated-mix";
import {
  regionOverInclusions,
  overInclusionMessage,
  sidoCodesToBrowseMainIds,
} from "@/lib/planner/brief/regions";
import { calcMixMetrics, type MixLine } from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import {
  scoreMediaCandidates,
  buildRecommendedMix,
  type ScoredMedia,
} from "@/lib/planner/brief/scoring";
import { MetricsPanel } from "@/components/planner/brief/metrics-panel";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";
import { BriefDigitalPanel } from "@/components/planner/brief/brief-digital-panel";

const AXIS_LABEL: Record<string, { ko: string; en: string }> = {
  target: { ko: "타깃 적합", en: "Target fit" },
  budget: { ko: "예산 효율", en: "Budget efficiency" },
  region: { ko: "지역 적합", en: "Region fit" },
};

function MediaCard({
  scored,
  units,
  isKo,
  days,
  onAdd,
  onRemove,
  onUnits,
}: {
  scored: ScoredMedia;
  units: number;
  isKo: boolean;
  days: number;
  onAdd: () => void;
  onRemove: () => void;
  onUnits: (n: number) => void;
}) {
  const { media, axes, total } = scored;
  const selected = units > 0;

  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {isKo ? media.name : media.nameEn || media.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {isKo ? media.location : media.locationEn || media.location}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold tabular-nums">
          {total}
        </span>
      </div>

      {/* 추천 근거 — 근거를 못 쓰는 축은 애초에 없다 */}
      {axes.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {axes.map((a) => (
            <li key={a.key} className="text-[11px] leading-snug">
              <span className="font-medium">
                {AXIS_LABEL[a.key]?.[isKo ? "ko" : "en"] ?? a.key} {a.score}
              </span>
              <span className="text-muted-foreground"> ← {a.rationale}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {isKo
            ? "이 매체에 대해 근거를 쓸 수 있는 축이 없습니다."
            : "No axis with a stateable rationale for this media."}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {selected ? (
          <>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => onUnits(units - 1)}
                aria-label={isKo ? "수량 감소" : "Decrease"}
              >
                −
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">{units}</span>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => onUnits(units + 1)}
                aria-label={isKo ? "수량 증가" : "Increase"}
              >
                +
              </Button>
            </div>
            <Button type="button" size="xs" variant="ghost" onClick={onRemove}>
              {isKo ? "제거" : "Remove"}
            </Button>
          </>
        ) : (
          <Button type="button" size="xs" onClick={onAdd}>
            {isKo ? "믹스에 추가" : "Add to mix"}
          </Button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {scored.unitCpmWon != null
            ? `CPM ₩${scored.unitCpmWon.toLocaleString()} / ${days}${isKo ? "일" : "d"}`
            : isKo
              ? "CPM 산정 중"
              : "CPM pending"}
        </span>
      </div>
    </li>
  );
}

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

  const days = flightDays(store) ?? 30;
  const budgetWon = totalBudgetWon(store);
  const showDigital = store.channelMode === "ooh_digital";

  // 지역 필터 — 17시도 선택을 browse 14그룹으로 변환해 적용
  const candidates = useMemo(() => {
    const wanted = new Set(sidoCodesToBrowseMainIds(store.regionCodes));
    if (wanted.size === 0) return catalog;
    return catalog.filter(
      (m) => !m.regionMain || wanted.has(m.regionMain) || m.regionMain === "national",
    );
  }, [catalog, store.regionCodes]);

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

  const lines: MixLine[] = useMemo(() => {
    const out: MixLine[] = [];
    for (const [mediaId, units] of Object.entries(store.mixUnits)) {
      const media = catalog.find((m) => m.id === mediaId);
      if (media && units > 0) out.push({ media, units });
    }
    return out;
  }, [catalog, store.mixUnits]);

  const metrics = useMemo(
    () =>
      calcMixMetrics({
        lines,
        days,
        budgetWon,
        target: briefToTargetSpec(store),
      }),
    [lines, days, budgetWon, store.genders, store.ageBands],
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

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── 좌: 추천 리스트 ── */}
      <div>
        {/* 과대포함 경고 — 무엇이 섞이는지 이름을 댄다 */}
        {overIncl.length > 0 ? (
          <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5">
            {overIncl.map((row) => (
              <p
                key={row.browseMainId}
                className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300"
              >
                {overInclusionMessage(row, isKo)}
              </p>
            ))}
          </div>
        ) : null}

        {/* demo 타깃 추정 안내 */}
        {store.genders.length > 0 || store.ageBands.length > 0 ? (
          <p className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <span>
              {isKo
                ? "성별·연령은 매체 유형·등록 정보 기반 추정치입니다."
                : "Gender and age use type-based or registered-text estimates."}
            </span>
            <DataQualityBadge basis="default" isKo={isKo} />
          </p>
        ) : null}

        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {isKo
              ? `추천 매체 ${scored.length}개`
              : `${scored.length} recommended media`}
          </h3>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              store.replaceMix(
                buildRecommendedMix({ scored, days, budgetWon }),
              )
            }
          >
            {isKo ? "예산 내 자동 구성" : "Auto-fill within budget"}
          </Button>
        </div>

        <ul className="space-y-2">
          {scored.slice(0, 30).map((s) => (
            <MediaCard
              key={s.media.id}
              scored={s}
              units={store.mixUnits[s.media.id] ?? 0}
              isKo={isKo}
              days={days}
              onAdd={() => store.addMediaToMix(s.media.id, 1)}
              onRemove={() => store.removeMediaFromMix(s.media.id)}
              onUnits={(n) => store.setMixUnits(s.media.id, n)}
            />
          ))}
        </ul>
        {scored.length === 0 ? (
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
      <div className="lg:sticky lg:top-4 lg:self-start">
        <MetricsPanel metrics={metrics} isKo={isKo} />

        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold">
            {isKo ? `선택 ${lines.length}개 매체` : `${lines.length} media selected`}
          </p>
          {lines.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {isKo
                ? "왼쪽에서 매체를 추가하면 지표가 즉시 갱신됩니다."
                : "Add media on the left — metrics update instantly."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {metrics.lines.map((l) => {
                const media = catalog.find((m) => m.id === l.mediaId);
                return (
                  <li
                    key={l.mediaId}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate">
                      {media ? (isKo ? media.name : media.nameEn || media.name) : l.mediaId}
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
            disabled={lines.length === 0}
            onClick={() => store.setWizardStep(3)}
          >
            {isKo ? "결과 보기" : "See result"}
          </Button>
        </div>
      </div>
    </div>
  );
}
