"use client";

/**
 * O-1 / PART3-5 + PR3 — Step 2 `channelMode === "digital_only"` 전용 화면.
 * OOH BriefMediaCard(units) 대신 OnlineMixChannelCard(budgetPct)로 mix 편집.
 */

import type { MediaItem } from "@/lib/media-data";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/planner/brief/store";
import {
  BriefOnlineOnlyPanel,
  useOnlineCatalogResult,
} from "@/components/planner/brief/brief-online-only-panel";

export function BriefStepTwoOnlineOnly({
  catalog,
  isKo,
}: {
  catalog: readonly MediaItem[];
  isKo: boolean;
}) {
  const store = useBriefStore();
  const hookResult = useOnlineCatalogResult(catalog, isKo);
  const canProceed = hookResult.result.platforms.length > 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4">
      <BriefOnlineOnlyPanel
        catalog={catalog}
        isKo={isKo}
        hookResult={hookResult}
        editable
      />

      <div className="flex gap-2">
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
          disabled={!canProceed}
          onClick={() => store.setWizardStep(3)}
          data-testid="brief-step-two-online-next"
        >
          {isKo ? "결과 보기" : "See result"}
        </Button>
      </div>
    </div>
  );
}
