"use client";

/**
 * PR-6c 통합 플래너 3단계 흐름 — `/planner` 메인.
 */

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore, type BriefStoreState } from "@/lib/planner/brief/store";
import { BriefStepOne } from "@/components/planner/brief/brief-step-one";
import { BriefStepTwo } from "@/components/planner/brief/brief-step-two";
import { BriefStepThree } from "@/components/planner/brief/brief-step-three";
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
    <ol className="mx-auto mb-8 flex max-w-3xl items-center gap-2 text-sm">
      {([1, 2, 3] as const).map((s, i) => {
        const active = s === step;
        const done = s < step;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => (s <= step ? onJump(s) : undefined)}
              disabled={s > step}
              className={`flex items-center gap-2 ${s > step ? "opacity-50" : ""}`}
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
              <span className={active ? "font-semibold" : "text-muted-foreground"}>
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
}: {
  catalog?: readonly MediaItem[];
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const wizardStep = useBriefStore(selectStep);
  const setWizardStep = useBriefStore((s) => s.setWizardStep);

  const hydrated = useSyncExternalStore(
    (cb) => useBriefStore.persist.onFinishHydration(cb),
    () => useBriefStore.persist.hasHydrated(),
    () => false,
  );
  const step: BriefWizardStep = hydrated ? wizardStep : 1;

  return (
    <div>
      <Stepper step={step} isKo={isKo} onJump={setWizardStep} />
      {step === 1 ? (
        <BriefStepOne />
      ) : step === 2 ? (
        <BriefStepTwo catalog={catalog} />
      ) : (
        <BriefStepThree catalog={catalog} />
      )}
    </div>
  );
}
