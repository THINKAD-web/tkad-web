"use client";

/**
 * PR-6c 통합 플래너 3단계 흐름 — `/planner` 메인.
 * L-1/L-2: 브리프·믹스 세션 경계 + 재진입 확인.
 *
 * N-1: React 19 + zustand — selector가 매 getSnapshot마다 새 객체를
 * 반환하면 useSyncExternalStore 무한 루프. boolean selector만 사용한다.
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { MediaItem } from "@/lib/media-data";
import type { DigitalChannel } from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge";
import { useBriefStore, type BriefStoreState } from "@/lib/planner/brief/store";
import { countMixUnits } from "@/lib/planner/brief/brief-fingerprint";
import {
  selectMixCount,
  selectMixIsStale,
  shouldOpenStaleMixDialog,
  shouldPromptResumeSession,
} from "@/lib/planner/brief/brief-session-logic";
import { rebuildBriefRecommendedMix } from "@/lib/planner/brief/rebuild-mix";
import { BriefStepOne } from "@/components/planner/brief/brief-step-one";
import { BriefStepTwo } from "@/components/planner/brief/brief-step-two";
import { BriefStepThree } from "@/components/planner/brief/brief-step-three";
import {
  BriefMixStaleDialog,
  BriefResumeDialog,
} from "@/components/planner/brief/brief-session-dialogs";
import type { BriefWizardStep } from "@/lib/planner/brief/types";

const STEP_LABELS: Record<BriefWizardStep, { ko: string; en: string }> = {
  1: { ko: "브리프", en: "Brief" },
  2: { ko: "믹스 편집", en: "Edit mix" },
  3: { ko: "결과", en: "Result" },
};

function Stepper({
  step,
  isKo,
  onJump,
}: {
  step: BriefWizardStep;
  isKo: boolean;
  onJump: (s: BriefWizardStep) => void;
}) {
  return (
    <ol className="mx-auto mb-8 flex min-w-0 max-w-3xl items-center gap-1 text-xs sm:gap-2 sm:text-sm">
      {([1, 2, 3] as const).map((s, i) => {
        const active = s === step;
        const done = s < step;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => (s <= step ? onJump(s) : undefined)}
              disabled={s > step}
              className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${s > step ? "opacity-50" : ""}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </span>
              <span
                className={`hidden truncate sm:inline ${active ? "font-semibold" : "text-muted-foreground"}`}
              >
                {STEP_LABELS[s][isKo ? "ko" : "en"]}
              </span>
            </button>
            {i < 2 ? <span className="h-px flex-1 bg-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

const selectStep = (s: BriefStoreState) => s.wizardStep;

export function BriefFlowClient({
  catalog = [],
  digitalChannels = [],
  digitalCatalogMeta,
}: {
  catalog?: readonly MediaItem[];
  digitalChannels?: readonly DigitalChannel[];
  digitalCatalogMeta?: DigitalCatalogBridgeMeta;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");

  const wizardStep = useBriefStore(selectStep);
  const mixCount = useBriefStore(selectMixCount);
  const mixIsStale = useBriefStore(selectMixIsStale);
  const setWizardStep = useBriefStore((s) => s.setWizardStep);
  const reset = useBriefStore((s) => s.reset);
  const replaceMix = useBriefStore((s) => s.replaceMix);
  const acknowledgeMixForCurrentBrief = useBriefStore(
    (s) => s.acknowledgeMixForCurrentBrief,
  );

  const hydrated = useSyncExternalStore(
    (cb) => useBriefStore.persist.onFinishHydration(cb),
    () => useBriefStore.persist.hasHydrated(),
    () => false,
  );
  const step: BriefWizardStep = hydrated ? wizardStep : 1;

  const [resumeOpen, setResumeOpen] = useState(false);
  const [staleOpen, setStaleOpen] = useState(false);
  const pendingStepRef = useRef<BriefWizardStep | null>(null);
  const resumePromptedRef = useRef(false);

  // L-2: hydration 직후 1회만 — mixCount를 effect deps에 넣지 않는다.
  useLayoutEffect(() => {
    if (resumePromptedRef.current) return;
    const state = useBriefStore.getState();
    const shouldOpen = shouldPromptResumeSession({
      hydrated,
      planFromUrl,
      alreadyPrompted: resumePromptedRef.current,
      mixUnits: state.mixUnits,
    });
    if (!shouldOpen) return;
    resumePromptedRef.current = true;
    setResumeOpen(true);
  }, [hydrated, planFromUrl]);

  const goToStep = useCallback(
    (target: BriefWizardStep) => {
      const state = useBriefStore.getState();
      if (
        shouldOpenStaleMixDialog({
          targetStep: target,
          state,
          resumeDialogOpen: resumeOpen,
          staleDialogOpen: staleOpen,
        })
      ) {
        pendingStepRef.current = target;
        setStaleOpen(true);
        return;
      }
      setWizardStep(target);
    },
    [setWizardStep, resumeOpen, staleOpen],
  );

  const handleResumeContinue = () => {
    const state = useBriefStore.getState();
    if (
      !state.mixBriefFingerprint &&
      countMixUnits(state.mixUnits) > 0
    ) {
      acknowledgeMixForCurrentBrief();
    }
    setResumeOpen(false);
  };

  const handleResumeFreshStart = () => {
    reset();
    setResumeOpen(false);
  };

  const handleKeepMix = () => {
    acknowledgeMixForCurrentBrief();
    setStaleOpen(false);
    const target = pendingStepRef.current ?? 2;
    pendingStepRef.current = null;
    setWizardStep(target);
  };

  const handleRebuildMix = () => {
    const state = useBriefStore.getState();
    replaceMix(
      rebuildBriefRecommendedMix({
        brief: state,
        catalog,
        isKo,
      }),
    );
    setStaleOpen(false);
    const target = pendingStepRef.current ?? 2;
    pendingStepRef.current = null;
    setWizardStep(target);
  };

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <BriefResumeDialog
        open={resumeOpen}
        mixCount={mixCount}
        isKo={isKo}
        onContinue={handleResumeContinue}
        onFreshStart={handleResumeFreshStart}
      />
      <BriefMixStaleDialog
        open={staleOpen}
        isKo={isKo}
        onKeepMix={handleKeepMix}
        onRebuildMix={handleRebuildMix}
      />

      <Stepper step={step} isKo={isKo} onJump={goToStep} />
      {step === 1 ? (
        <BriefStepOne catalog={catalog} onRequestNext={() => goToStep(2)} />
      ) : step === 2 ? (
        <BriefStepTwo
          catalog={catalog}
          digitalChannels={digitalChannels}
          digitalCatalogMeta={digitalCatalogMeta}
        />
      ) : (
        <BriefStepThree catalog={catalog} />
      )}

      {step === 2 && mixIsStale && !staleOpen && !resumeOpen ? (
        <p className="mx-auto mt-4 max-w-3xl rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          {isKo
            ? "브리프 조건이 담을 때와 다릅니다. Step 1으로 돌아가 확인하거나, 매체를 조정해 주세요."
            : "Brief conditions differ from when media was added. Review Step 1 or adjust the mix."}
        </p>
      ) : null}
    </div>
  );
}
