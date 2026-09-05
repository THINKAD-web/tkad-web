"use client";

/**
 * O-1 / PART3-5 — Step 3 `channelMode === "digital_only"` 결과 화면.
 *
 * dmpilot MixReportView의 UX(예산 도넛 + KPI 그리드 + 채널 카드)만 참고 —
 * 값은 전부 recommendOnlineCatalogChannels() 자체 계산. 퍼널(인지/고려/전환)은
 * 뒷받침할 데이터가 없어 넣지 않는다.
 *
 * OOH 믹스·제안서 PDF·이메일 파이프라인(브리프 리포트 어댑터)은 OOH 카탈로그
 * 전제라 이 화면 범위 밖 — 저장·PDF는 이후 단계에서 별도로 다룬다.
 */

import type { MediaItem } from "@/lib/media-data";
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
