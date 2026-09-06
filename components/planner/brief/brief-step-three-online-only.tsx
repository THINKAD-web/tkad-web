"use client";

/**
 * O-1 / PART3-5 + 3-6 — Step 3 `channelMode === "digital_only"` 결과 화면.
 *
 * dmpilot MixReportView의 UX(예산 도넛 + KPI 그리드 + 채널 카드)만 참고 —
 * 값은 전부 recommendOnlineCatalogChannels() 자체 계산. 퍼널(인지/고려/전환)은
 * 뒷받침할 데이터가 없어 넣지 않는다.
 *
 * 저장·PDF/PPTX는 OOH Step3와 같은 파이프라인을 재사용한다
 * (buildBriefReportPayload → downloadPlannerReport) — `channelMode`로
 * 브랜치만 타고 렌더 코드는 그대로. 표지 로고 업로드·이메일 발송·제작비
 * 입력은 OOH 전용 개념이라 이번 범위에서는 제외(필요해지면 같은 방식으로
 * 확장).
 */

import { useCallback, useMemo, useState } from "react";
import { FileDown, Loader2, Lock } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { SavedCampaignPlan } from "@/lib/campaign-plan-store";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/planner/brief/store";
import { BriefSummary } from "@/components/planner/brief/brief-step-three";
import { useOnlineCatalogResult } from "@/components/planner/brief/brief-online-only-panel";
import { OnlineBudgetDonut } from "@/components/planner/brief/brief-online-budget-donut";
import { OnlineKpiGrid } from "@/components/planner/brief/brief-online-kpi-grid";
import {
  OnlineChannelCard,
  OnlineExcludedForBudgetSection,
} from "@/components/planner/brief/brief-online-channel-cards";
import { summarizeOnlineResultKpis } from "@/lib/planner/brief/online-result-kpis";
import { buildOnlineCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { useToast } from "@/components/toast-provider";

export function BriefStepThreeOnlineOnly({
  catalog,
  isKo,
}: {
  catalog: readonly MediaItem[];
  isKo: boolean;
}) {
  const store = useBriefStore();
  const result = useOnlineCatalogResult(catalog, isKo);
  const kpis = summarizeOnlineResultKpis(result);
  const hasResult = result.platforms.length > 0;
  const { toast } = useToast();

  const [savedPlan, setSavedPlan] = useState<SavedCampaignPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  const exportPlan = useMemo(() => {
    if (savedPlan) return savedPlan;
    if (!hasResult) return null;
    return buildOnlineCampaignPlanSnapshot({ brief: store, result, isKo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPlan, hasResult, result, isKo]);

  const exportPayload = useMemo(() => {
    if (!exportPlan) return null;
    return buildBriefReportPayload({
      plan: exportPlan,
      catalog,
      isKo,
      channelMode: "digital_only",
    });
  }, [exportPlan, catalog, isKo]);

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
          channelMode: "digital_only",
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
      toast("success", isKo ? "플랜을 저장했습니다." : "Plan saved.");
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : isKo
            ? "저장에 실패했습니다."
            : "Save failed.";
      setSaveError(msg);
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  }, [store, isKo, toast]);

  const handleExport = useCallback(
    async (format: "pdf" | "pptx") => {
      if (exporting || !exportPayload) return;
      setExporting(format);
      try {
        await downloadPlannerReport(format, exportPayload, {
          activitySource: "planner",
        });
        toast(
          "success",
          isKo ? "제안서를 저장했습니다." : "Proposal saved.",
        );
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : isKo
              ? "제안서 생성에 실패했습니다."
              : "Proposal export failed.";
        toast("error", msg);
      } finally {
        setExporting(null);
      }
    },
    [exporting, exportPayload, toast, isKo],
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4">
      <BriefSummary brief={store} isKo={isKo} />

      {!hasResult ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center tkad-type-body text-muted-foreground">
          {result.noRelevantChannels
            ? isKo
              ? "조건에 맞는 온라인 채널이 없습니다. Step 1·2로 돌아가 조건을 조정해 주세요."
              : "No online channels match your brief. Go back to Step 1–2 to adjust it."
            : isKo
              ? "추천 결과가 없습니다. Step 2로 돌아가 확인해 주세요."
              : "No recommendation available. Go back to Step 2."}
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 tkad-type-title">
              {isKo ? "예산 배분" : "Budget allocation"}
            </h3>
            <OnlineBudgetDonut platforms={result.platforms} isKo={isKo} />
          </div>

          <OnlineKpiGrid kpis={kpis} isKo={isKo} />

          <div>
            <h3 className="mb-2 tkad-type-title">
              {isKo ? "추천 채널" : "Recommended channels"}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.platforms.map((group) => (
                <OnlineChannelCard key={group.platform} group={group} isKo={isKo} />
              ))}
            </div>
          </div>

          <OnlineExcludedForBudgetSection
            entries={result.excludedForBudget}
            isKo={isKo}
          />

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="tkad-type-title">
              {isKo ? "저장 · 제안서" : "Save · Proposal"}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={saving}
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

              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={() => void handleExport("pdf")}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={exporting !== null || checking || !exportPayload}
                    onClick={onDownloadClick}
                  >
                    {exporting === "pdf" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : !pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "제안서 PDF" : "Proposal PDF"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>

              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={() => void handleExport("pptx")}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={exporting !== null || checking || !exportPayload}
                    onClick={onDownloadClick}
                  >
                    {exporting === "pptx" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : !pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "제안서 PPTX" : "Proposal PPTX"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>
            </div>
            {saveError ? (
              <p className="tkad-type-caption text-destructive">{saveError}</p>
            ) : null}
            {savedPlan ? (
              <p className="tkad-type-caption text-muted-foreground">
                {isKo ? "저장 시각" : "Saved at"}:{" "}
                {new Date(savedPlan.createdAt).toLocaleString(
                  isKo ? "ko-KR" : "en-US",
                )}
              </p>
            ) : null}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => store.setWizardStep(2)}
        >
          {isKo ? "← 채널 편집" : "← Edit channels"}
        </Button>
      </div>
    </div>
  );
}
