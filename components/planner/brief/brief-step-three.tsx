"use client";

/**
 * PR-6c Step 3 · 결과 요약 + 저장.
 *
 * 브리프 · 확정 믹스 · 지표 3+4 요약.
 * 제안서 생성(8단계)·공유 링크는 UI만 — 비활성.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FileDown, Loader2, Lock, Mail } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { SavedCampaignPlan } from "@/lib/campaign-plan-store";
import {
  resolveStoredOverBudget,
  isCustomMixEntry,
  type CampaignPlanStoredMetrics,
} from "@/lib/campaign-plan-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricsPanel } from "@/components/planner/brief/metrics-panel";
import { OverBudgetChoicePanel } from "@/components/planner/brief/over-budget-choice-panel";
import { resolveOverBudgetChoice } from "@/lib/planner/brief/over-budget-options";
import {
  applyCustomLinesToMixMetrics,
  hasBriefMixContent,
} from "@/lib/planner/brief/custom-mix-metrics";
import { BriefResultSummary } from "@/components/planner/brief/brief-result-summary";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  buildCampaignPlanSnapshot,
  buildMixLines,
} from "@/lib/planner/brief/build-plan-snapshot";
import {
  briefMixQuantities,
  briefPriceOptionIndex,
  buildBriefReportCopyStrategyInput,
  buildBriefReportPayload,
  resolveBriefPortfolio,
} from "@/lib/planner/brief/brief-report-adapter";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { ReportStylePicker } from "@/components/planner/report-style-picker";
import { usePlannerReportStyle } from "@/hooks/use-planner-report-style";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";
import { useShallow } from "zustand/react/shallow";
import { useReportCopyStore } from "@/lib/planner-report-export/report-copy-store";
import { serializePlannerReportCopyState } from "@/lib/planner-report-export/report-copy-state";
import { useReportCopyAutoDraft } from "@/lib/planner-report-export/use-report-copy-auto-draft";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { ReportCopyStaleBanner } from "@/components/planner/report-copy-stale-banner";
import { ReportEmailSendDialog } from "@/components/planner/report-email-send-dialog";
import { Input } from "@/components/ui/input";
import { uploadPlannerCreative } from "@/lib/planner/creative-upload";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { plannerProposalGateHint } from "@/lib/entitlements/tier-copy";
import { useToast } from "@/components/toast-provider";
import {
  calcMixMetrics,
  type MixMetrics,
} from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import {
  BRIEF_DEFAULT_DAYS,
  flightDays,
  totalBudgetWon,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { summarizeSidoCodes } from "@/lib/planner/brief/regions";
import { summarizeBriefTargetLine } from "@/lib/planner/brief/plain-language-summary";

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
  const { overBudgetWon, budgetUsedRate } = resolveStoredOverBudget(
    stored,
    budgetWon,
  );
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
    budgetUsedRate,
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
      <h3 className="mb-3 tkad-type-title">
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
  const days = flightDays(store) ?? BRIEF_DEFAULT_DAYS;
  const budgetWon = totalBudgetWon(store);
  const lines = useMemo(
    () => buildMixLines(catalog, store.mixUnits),
    [catalog, store.mixUnits],
  );

  const liveCatalogMetrics = useMemo(
    () =>
      calcMixMetrics({
        lines,
        days,
        budgetWon,
        target: briefToTargetSpec(store),
      }),
    [lines, days, budgetWon, store.genders, store.ageBands],
  );

  const liveMetrics = useMemo(
    () =>
      applyCustomLinesToMixMetrics(liveCatalogMetrics, store.customLines),
    [liveCatalogMetrics, store.customLines],
  );

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

  const [savedPlan, setSavedPlan] = useState<SavedCampaignPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(planFromUrl));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] =
    useState<PlannerReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const {
    allowed: reportPreviewAllowed,
    loading: reportPreviewLoading,
  } = useFeatureAccess("planner_result");
  const [reportStyle, setReportStyle] = usePlannerReportStyle();

  const setReportClientName = useReportCopyStore((s) => s.setClientName);
  const setReportDocumentTitle = useReportCopyStore((s) => s.setDocumentTitle);
  const coverLogoUrl = useReportCopyStore((s) => s.coverLogoUrl);
  const setCoverLogoUrl = useReportCopyStore((s) => s.setCoverLogoUrl);
  const productionCostWon = useReportCopyStore((s) => s.productionCostWon);
  const setProductionCostWon = useReportCopyStore((s) => s.setProductionCostWon);
  const hydrateReportCopy = useReportCopyStore((s) => s.hydrateFromSnapshot);

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
        if (!cancelled) {
          setSavedPlan(data);
          if (data.reportCopy) {
            hydrateReportCopy(data.reportCopy);
          }
        }
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
  }, [planFromUrl, isKo, hydrateReportCopy]);

  const displayMetrics: MixMetrics = savedPlan
    ? storedMetricsToMixMetrics(savedPlan.metrics, savedPlan.brief.budgetWon)
    : liveMetrics;

  const mixRows = savedPlan?.mediaMix ?? null;

  const displayMixRows = useMemo(() => {
    if (mixRows) {
      return mixRows.map((entry) => {
        if (isCustomMixEntry(entry)) {
          return {
            kind: "custom" as const,
            lineId: entry.lineId,
            name: entry.name,
            quantity: entry.quantity,
            unitPriceWon: entry.unitPriceWon,
            priceWon: entry.priceWon,
          };
        }
        return {
          kind: "catalog" as const,
          mediaId: entry.mediaId,
          name: entry.name,
          units: entry.units,
          priceWon: entry.priceWon,
          impressions: entry.impressions,
        };
      });
    }
    return [
      ...lines.map((l) => ({
        kind: "catalog" as const,
        mediaId: l.media.id,
        name: l.media.name,
        units: l.units,
        priceWon:
          liveMetrics.lines.find((x) => x.mediaId === l.media.id)?.costWon
            ?.value ?? 0,
        impressions:
          liveMetrics.lines.find((x) => x.mediaId === l.media.id)?.impressions
            .value ?? 0,
      })),
      ...store.customLines.map((line) => ({
        kind: "custom" as const,
        lineId: line.lineId,
        name: line.name,
        quantity: line.quantity,
        unitPriceWon: line.unitPriceWon,
        priceWon: line.quantity * line.unitPriceWon,
      })),
    ];
  }, [mixRows, lines, liveMetrics.lines, store.customLines]);

  const customLineCount = useMemo(
    () =>
      mixRows
        ? mixRows.filter(isCustomMixEntry).length
        : store.customLines.length,
    [mixRows, store.customLines],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const copyState = useReportCopyStore.getState();
    const reportCopy = serializePlannerReportCopyState({
      clientName: copyState.clientName,
      documentTitle: copyState.documentTitle,
      coverLogoUrl: copyState.coverLogoUrl,
      greeting: copyState.greeting,
      executiveSummary: copyState.executiveSummary,
      greetingTouched: copyState.greetingTouched,
      executiveSummaryTouched: copyState.executiveSummaryTouched,
      copyFingerprint: copyState.copyFingerprint,
      productionCostWon: copyState.productionCostWon,
    });
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
          customLines: store.customLines,
          reportCopy,
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

  const hasMix = hasBriefMixContent(store.mixUnits, store.customLines);

  const exportPlan = useMemo(() => {
    if (savedPlan) return savedPlan;
    if (!hasMix) return null;
    return buildCampaignPlanSnapshot({
      brief: store,
      catalog,
      mixUnits: store.mixUnits,
      customLines: store.customLines,
    });
  }, [savedPlan, hasMix, store.mixUnits, store.customLines, catalog, store]);

  const exportPortfolio = useMemo(
    () => (exportPlan ? resolveBriefPortfolio(exportPlan, catalog) : []),
    [exportPlan, catalog],
  );

  const exportQuantities = useMemo(
    () => (exportPlan ? briefMixQuantities(exportPlan.mediaMix) : {}),
    [exportPlan],
  );

  const exportPriceOptionIndex = useMemo(
    () =>
      exportPlan ? briefPriceOptionIndex(exportPlan.mediaMix, catalog) : {},
    [exportPlan, catalog],
  );

  const reportCopySnapshot = useReportCopyStore(
    useShallow((s) => ({
      clientName: s.clientName,
      documentTitle: s.documentTitle,
      coverLogoUrl: s.coverLogoUrl,
      greeting: s.greeting,
      executiveSummary: s.executiveSummary,
      greetingTouched: s.greetingTouched,
      executiveSummaryTouched: s.executiveSummaryTouched,
      copyFingerprint: s.copyFingerprint,
      productionCostWon: s.productionCostWon,
    })),
  );

  const copyStrategyInput = useMemo(
    () =>
      exportPlan
        ? buildBriefReportCopyStrategyInput(exportPlan, catalog, isKo)
        : null,
    [exportPlan, catalog, isKo],
  );

  const {
    setGreeting,
    setExecutiveSummary,
    copyStale,
    regenerate: regenerateReportCopy,
    keepEdits: keepReportCopyEdits,
  } = useReportCopyAutoDraft({
    isKo,
    enabled: hasMix && copyStrategyInput != null,
    fingerprint: {
      mediaIds: exportPortfolio.map((m) => m.id),
      quantities: exportQuantities,
      priceOptionIndex: exportPriceOptionIndex,
    },
    strategyInput: copyStrategyInput ?? {
      isKo,
      campaignGoal: "brand",
      goalTitle: isKo ? "브랜드 인지도" : "Brand awareness",
      industryKey: "indOther",
      industryText: isKo ? "기타" : "Other",
      regionsText: isKo ? "전국" : "Nationwide",
      seoulZones: [],
      followUp: {},
      portfolioCount: 0,
      topMediaName: isKo ? "핵심 매체" : "key media",
    },
  });

  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(isKo ? "ko-KR" : "en-US"),
  );

  const exportPayload = useMemo(() => {
    if (!exportPlan) return null;
    return buildBriefReportPayload({
      plan: exportPlan,
      catalog,
      isKo,
      channelMode: store.channelMode,
      hasDigitalSnapshot: false,
      reportCopy: reportCopySnapshot,
      generatedAt: snapshotAt,
    });
  }, [
    exportPlan,
    catalog,
    isKo,
    store.channelMode,
    reportCopySnapshot,
    snapshotAt,
  ]);

  const handleLogoUpload = useCallback(
    async (file: File) => {
      setLogoUploading(true);
      try {
        const result = await uploadPlannerCreative(file);
        setCoverLogoUrl(result.secureUrl);
        toast(
          "success",
          isKo ? "표지 로고를 업로드했습니다." : "Cover logo uploaded.",
        );
      } catch (e) {
        console.error("[brief-step-three logo]", e);
        toast(
          "error",
          isKo ? "로고 업로드에 실패했습니다." : "Logo upload failed.",
        );
      } finally {
        setLogoUploading(false);
      }
    },
    [isKo, setCoverLogoUrl, toast],
  );

  const handleExport = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (exporting || !exportPayload) return;
      setExporting(format);
      setExportError(null);
      try {
        await downloadPlannerReport(format, exportPayload, {
          activitySource: "planner",
          style: reportStyle,
        });
        toast(
          "success",
          isKo ? "제안서를 저장했습니다." : "Proposal saved.",
        );
      } catch (e) {
        console.error("[brief-step-three export]", e);
        const msg =
          e instanceof Error
            ? e.message
            : isKo
              ? "제안서 생성에 실패했습니다."
              : "Proposal export failed.";
        setExportError(msg);
        toast("error", msg);
      } finally {
        setExporting(null);
      }
    },
    [exporting, exportPayload, toast, isKo, reportStyle],
  );

  const won = (n: number) =>
    isKo ? `₩${n.toLocaleString("ko-KR")}` : `₩${n.toLocaleString("en-US")}`;

  const summaryMediaCount = displayMixRows.length;

  if (loadingPlan) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {isKo ? "저장된 플랜 불러오는 중…" : "Loading saved plan…"}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
    {summaryMediaCount > 0 ? (
      <BriefResultSummary
        isKo={isKo}
        budgetWon={displayMetrics.budgetWon}
        totalImpressions={displayMetrics.totalImpressions.value}
        netReach={displayMetrics.netReach?.value ?? null}
        mediaCount={summaryMediaCount}
        days={days}
        targetLine={summarizeBriefTargetLine(store, isKo)}
        budgetSplit={exportPayload?.charts?.budgetSplit}
      />
    ) : null}
    <div className="grid w-full gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 max-w-full space-y-4">
        <BriefSummary brief={store} isKo={isKo} />

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="tkad-type-title">
              {isKo ? "확정 믹스" : "Confirmed mix"}
            </h3>
            <Badge variant="secondary">
              {displayMixRows.length}
              {isKo ? "개 항목" : " item(s)"}
            </Badge>
          </div>
          <ul className="divide-y divide-border">
            {displayMixRows.map((row) => {
              if (row.kind === "custom") {
                return (
                  <li
                    key={row.lineId}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    data-testid="brief-step-three-custom-row"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <span className="mr-1.5 rounded bg-violet-600/15 px-1 py-0.5 tkad-type-note font-bold text-violet-700 dark:text-violet-300">
                          {isKo ? "커스텀" : "Custom"}
                        </span>
                        {row.name}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        ×{row.quantity} · ₩{row.unitPriceWon.toLocaleString()}
                        {isKo ? " · 산정 불가" : " · N/A metrics"}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {won(row.priceWon)}
                    </span>
                  </li>
                );
              }
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
          metrics={displayMetrics}
          isKo={isKo}
          customLineCount={customLineCount}
        />

        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <label htmlFor="brief-production-cost" className="tkad-type-title">
            {isKo ? "제작비 (캠페인 총액)" : "Production cost (campaign total)"}
          </label>
          <p className="mt-1 tkad-type-caption text-muted-foreground">
            {isKo
              ? "견적 요약 표에 반영됩니다. 부가세는 매체비+제작비 기준 10%입니다."
              : "Shown in the quote summary. VAT is 10% of media + production."}
          </p>
          <Input
            id="brief-production-cost"
            type="text"
            inputMode="numeric"
            className="mt-2 tabular-nums"
            placeholder={isKo ? "예: 3000000" : "e.g. 3000000"}
            value={
              productionCostWon != null && productionCostWon > 0
                ? String(productionCostWon)
                : ""
            }
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              if (!raw) {
                setProductionCostWon(null);
                return;
              }
              setProductionCostWon(Number(raw));
            }}
          />
        </div>

        <div className="mt-3 space-y-2">
          <Button
            type="button"
            className="w-full"
            disabled={saving || !hasMix}
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
          <p className="tkad-type-caption text-muted-foreground">
            {isKo
              ? "공유는 행정동 인구 데이터 연동 후 제공됩니다."
              : "Sharing unlocks after dong population data is connected."}
          </p>

          <p className="tkad-type-caption text-muted-foreground">
            {isKo
              ? "제안서 PDF·이메일은 아래 미리보기에서 이용할 수 있습니다."
              : "Export and email the proposal from the preview below."}
          </p>
          {store.channelMode === "ooh_digital" ? (
            <p className="tkad-type-caption text-muted-foreground">
              {isKo
                ? "디지털 채널 배분은 이번 보고서에 포함되지 않았습니다."
                : "Digital channel allocation is not included in this report."}
            </p>
          ) : null}
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

    {exportPayload && exportPayload.portfolio.length > 0 ? (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="tkad-type-title">
              {isKo ? "제안서 미리보기" : "Proposal preview"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isKo
                ? "표지·인사말·요약을 편집한 뒤 PDF·이메일로 보낼 수 있습니다."
                : "Edit cover copy, then export or email the proposal."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleLogoUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoUploading || !reportPreviewAllowed}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUploading
                ? isKo
                  ? "업로드 중…"
                  : "Uploading…"
                : coverLogoUrl
                  ? isKo
                    ? "표지 로고 변경"
                    : "Change cover logo"
                  : isKo
                    ? "표지 로고 업로드"
                    : "Upload cover logo"}
            </Button>
          </div>
        </div>

        {reportPreviewLoading ? (
          <p className="text-sm text-muted-foreground">
            {isKo ? "권한 확인 중…" : "Checking access…"}
          </p>
        ) : !reportPreviewAllowed ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {plannerProposalGateHint(isKo)}
          </div>
        ) : (
          <div className="space-y-4">
            {copyStale ? (
              <ReportCopyStaleBanner
                isKo={isKo}
                onRegenerate={regenerateReportCopy}
                onKeep={keepReportCopyEdits}
              />
            ) : null}
            <ReportStylePicker
              isKo={isKo}
              value={reportStyle}
              onChange={setReportStyle}
            />
            <DocumentPreviewFrame>
              <PlannerReportDocument
                payload={exportPayload}
                mapPortfolio={exportPortfolio}
                reportStyle={reportStyle}
                editableTitle
                onDocumentTitleChange={setReportDocumentTitle}
                editableClientName
                onClientNameChange={setReportClientName}
                editableGreeting
                onGreetingChange={setGreeting}
                editableExecutiveSummary
                onExecutiveSummaryChange={setExecutiveSummary}
              />
            </DocumentPreviewFrame>

            <div className="flex flex-wrap gap-2">
              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={() => void handleExport("pdf")}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={exporting !== null || checking}
                    onClick={onDownloadClick}
                  >
                    {exporting === "pdf" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : !pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    {!pdfAllowed
                      ? isKo
                        ? "제안서 PDF (PRO)"
                        : "Proposal PDF (PRO)"
                      : isKo
                        ? "제안서 PDF 생성"
                        : "Generate proposal PDF"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>

              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={() => setEmailDialogOpen(true)}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="default"
                    disabled={checking}
                    onClick={onDownloadClick}
                  >
                    {!pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "이메일로 보내기" : "Email proposal"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>
            </div>

            {exportError ? (
              <p className="text-xs text-destructive">{exportError}</p>
            ) : null}
          </div>
        )}

        <ReportEmailSendDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          isKo={isKo}
          exportPayload={exportPayload}
          activitySource="planner"
          onSent={() => {
            toast(
              "success",
              isKo ? "제안서를 이메일로 보냈습니다." : "Proposal emailed.",
            );
          }}
        />
      </section>
    ) : null}
    </div>
  );
}
