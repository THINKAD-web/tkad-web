"use client";

/**
 * PR-6c Step 3 · 결과 요약 + 저장.
 *
 * 브리프 · 확정 믹스 · 지표 3+4 요약.
 * 제안서 생성(8단계)·공유 링크는 UI만 — 비활성.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { MediaItem } from "@/lib/media-data";
import type { SavedCampaignPlan } from "@/lib/campaign-plan-store";
import type { CampaignPlanStoredMetrics } from "@/lib/campaign-plan-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricsPanel } from "@/components/planner/brief/metrics-panel";
import { useBriefStore } from "@/lib/planner/brief/store";
import { buildMixLines } from "@/lib/planner/brief/build-plan-snapshot";
import {
  calcMixMetrics,
  type MixMetrics,
} from "@/lib/planner/brief/mix-metrics";
import {
  flightDays,
  totalBudgetWon,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { summarizeSidoCodes } from "@/lib/planner/brief/regions";

const GOAL_LABELS = {
  awareness: { ko: "인지", en: "Awareness" },
  consideration: { ko: "고려", en: "Consideration" },
  conversion: { ko: "전환", en: "Conversion" },
} as const;

function storedMetricsToMixMetrics(
  stored: CampaignPlanStoredMetrics,
  budgetWon: number,
): MixMetrics {
  const totalCostWon = stored.totalCostWon;
  const overBudgetWon = Math.max(0, totalCostWon - budgetWon);
  return {
    lines: [],
    totalCostWon: {
      value: totalCostWon,
      basis: stored.dataQuality.totalCostWon,
    },
    totalImpressions: {
      value: stored.totalImpressions,
      basis: stored.dataQuality.totalImpressions,
    },
    mixCpmWon: {
      value: stored.mixCpmWon,
      basis: stored.dataQuality.mixCpmWon ?? "default",
    },
    netReach: null,
    reachRate: null,
    frequency: null,
    grp: null,
    budgetWon,
    budgetUsedRate: budgetWon > 0 ? totalCostWon / budgetWon : 0,
    overBudgetWon,
    isOverBudget: overBudgetWon > 0,
  };
}

function BriefSummary({
  brief,
  isKo,
}: {
  brief: CampaignBriefInput;
  isKo: boolean;
}) {
  const days = flightDays(brief);
  const budget = totalBudgetWon(brief);
  const regions =
    brief.regionCodes.length === 0
      ? isKo
        ? "전국"
        : "Nationwide"
      : summarizeSidoCodes(brief.regionCodes, isKo);

  const genders =
    brief.genders.length === 0
      ? isKo
        ? "전 성별"
        : "All genders"
      : brief.genders
          .map((g) =>
            g === "female" ? (isKo ? "여성" : "Female") : isKo ? "남성" : "Male",
          )
          .join(", ");

  const ages =
    brief.ageBands.length === 0
      ? isKo
        ? "전 연령"
        : "All ages"
      : brief.ageBands.join(", ");

  const won = (n: number) =>
    isKo ? `₩${n.toLocaleString("ko-KR")}` : `₩${n.toLocaleString("en-US")}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">
        {isKo ? "캠페인 브리프" : "Campaign brief"}
      </h3>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{isKo ? "예산" : "Budget"}</dt>
          <dd className="font-semibold tabular-nums">{won(budget)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{isKo ? "기간" : "Flight"}</dt>
          <dd className="font-medium tabular-nums">
            {brief.flightStart && brief.flightEnd
              ? `${brief.flightStart} → ${brief.flightEnd}${days != null ? ` (${days}${isKo ? "일" : "d"})` : ""}`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{isKo ? "지역" : "Region"}</dt>
          <dd className="text-right font-medium">{regions}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{isKo ? "타깃" : "Target"}</dt>
          <dd className="text-right font-medium">
            {genders} · {ages}
          </dd>
        </div>
        {brief.goal ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{isKo ? "목표" : "Goal"}</dt>
            <dd className="font-medium">
              {GOAL_LABELS[brief.goal][isKo ? "ko" : "en"]}
            </dd>
          </div>
        ) : null}
      </dl>
      {brief.freeText ? (
        <p className="mt-3 rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
          {brief.freeText}
        </p>
      ) : null}
    </div>
  );
}

export function BriefStepThree({
  catalog,
}: {
  catalog: readonly MediaItem[];
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");

  const store = useBriefStore();
  const days = flightDays(store) ?? 1;
  const budgetWon = totalBudgetWon(store);
  const lines = useMemo(
    () => buildMixLines(catalog, store.mixUnits),
    [catalog, store.mixUnits],
  );

  const liveMetrics = useMemo(
    () => calcMixMetrics({ lines, days, budgetWon }),
    [lines, days, budgetWon],
  );

  const [savedPlan, setSavedPlan] = useState<SavedCampaignPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(planFromUrl));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!planFromUrl) return;
    let cancelled = false;
    setLoadingPlan(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/campaign-plan/${encodeURIComponent(planFromUrl)}`,
        );
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as SavedCampaignPlan;
        if (!cancelled) setSavedPlan(data);
      } catch {
        if (!cancelled) {
          setSaveError(
            isKo
              ? "저장된 플랜을 불러오지 못했습니다."
              : "Failed to load saved plan.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planFromUrl, isKo]);

  const displayMetrics: MixMetrics = savedPlan
    ? storedMetricsToMixMetrics(savedPlan.metrics, savedPlan.brief.budgetWon)
    : liveMetrics;

  const mixRows = savedPlan?.mediaMix ?? null;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/campaign-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            budgetInputWon: store.budgetInputWon,
            budgetMode: store.budgetMode,
            regionCodes: store.regionCodes,
            genders: store.genders,
            ageBands: store.ageBands,
            goal: store.goal,
            industry: store.industry,
            flightStart: store.flightStart,
            flightEnd: store.flightEnd,
            freeText: store.freeText,
          },
          mixUnits: store.mixUnits,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "save failed");
      }
      const data = (await res.json()) as SavedCampaignPlan;
      setSavedPlan(data);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("plan", data.id);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? e.message
          : isKo
            ? "저장에 실패했습니다."
            : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }, [store, isKo]);

  const won = (n: number) =>
    isKo ? `₩${n.toLocaleString("ko-KR")}` : `₩${n.toLocaleString("en-US")}`;

  if (loadingPlan) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {isKo ? "저장된 플랜 불러오는 중…" : "Loading saved plan…"}
      </p>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <BriefSummary brief={store} isKo={isKo} />

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {isKo ? "확정 믹스" : "Confirmed mix"}
            </h3>
            <Badge variant="secondary">
              {mixRows?.length ?? lines.length}
              {isKo ? "개 매체" : " media"}
            </Badge>
          </div>
          <ul className="divide-y divide-border">
            {(mixRows ??
              lines.map((l) => ({
                mediaId: l.media.id,
                name: l.media.name,
                units: l.units,
                priceWon:
                  liveMetrics.lines.find((x) => x.mediaId === l.media.id)
                    ?.costWon?.value ?? 0,
                impressions:
                  liveMetrics.lines.find((x) => x.mediaId === l.media.id)
                    ?.impressions.value ?? 0,
              }))).map((row) => {
              const media = catalog.find((m) => m.id === row.mediaId);
              const name =
                media != null
                  ? isKo
                    ? media.name
                    : media.nameEn || media.name
                  : row.name;
              return (
                <li
                  key={row.mediaId}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      ×{row.units} · {row.impressions.toLocaleString()}{" "}
                      {isKo ? "노출" : "imps"}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {won(row.priceWon)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {savedPlan ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              {isKo ? "저장 완료" : "Saved"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isKo ? "저장 시각" : "Saved at"}:{" "}
              {new Date(savedPlan.createdAt).toLocaleString(
                isKo ? "ko-KR" : "en-US",
              )}
              {" · "}
              engine {savedPlan.engineVersion}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isKo
                ? "재접속 시 이 URL의 숫자는 저장 스냅샷 기준입니다."
                : "Revisiting this URL shows the saved snapshot."}
            </p>
          </div>
        ) : null}

        {saveError ? (
          <p className="text-sm text-destructive">{saveError}</p>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <MetricsPanel metrics={displayMetrics} isKo={isKo} />

        <div className="mt-3 space-y-2">
          <Button
            type="button"
            className="w-full"
            disabled={saving || lines.length === 0}
            onClick={() => void handleSave()}
          >
            {saving
              ? isKo
                ? "저장 중…"
                : "Saving…"
              : savedPlan
                ? isKo
                  ? "다시 저장"
                  : "Save again"
                : isKo
                  ? "플랜 저장"
                  : "Save plan"}
          </Button>

          <Button type="button" variant="outline" className="w-full" disabled>
            {isKo ? "공유 링크 (준비 중)" : "Share link (coming soon)"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {isKo
              ? "공유는 행정동 인구 데이터 연동 후 제공됩니다."
              : "Sharing unlocks after dong population data is connected."}
          </p>

          <Button type="button" variant="secondary" className="w-full" disabled>
            {isKo
              ? "제안서 생성 (8단계 · 준비 중)"
              : "Generate proposal (step 8 · soon)"}
          </Button>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={() => store.setWizardStep(2)}
          >
            {isKo ? "← 믹스 편집" : "← Edit mix"}
          </Button>
        </div>
      </div>
    </div>
  );
}
