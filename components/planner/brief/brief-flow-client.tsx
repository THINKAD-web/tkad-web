"use client";

/**
 * PR-6a 통합 플래너 3단계 흐름 (임시 마운트 `/planner/v2`).
 *
 * 6a 범위: Step 1 만 실제 구현. Step 2(믹스 편집)·Step 3(요약·저장)은
 * 후속 PR(6b/6c) 자리표시자. 흐름·상태 전환만 먼저 검증한다.
 *
 * 6c 에서 `/planner` 를 이 흐름으로 교체하고 legacy 6단계를 리다이렉트한다.
 */

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import { useBriefStore, type BriefStoreState } from "@/lib/planner/brief/store";
import { BriefStepOne } from "@/components/planner/brief/brief-step-one";
import { BriefStepTwo } from "@/components/planner/brief/brief-step-two";
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

function StepPlaceholder({
  isKo,
  onBack,
}: {
  isKo: boolean;
  onBack: () => void;
}) {
  const pr = "PR-6c";
  const title = isKo ? "결과 · 저장·공유" : "Result · save & share";
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-border p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {isKo
          ? `이 단계는 ${pr} 에서 구현됩니다. Step 1 브리프 상태는 저장되어 있습니다.`
          : `This step ships in ${pr}. Your Step 1 brief is saved.`}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-sm font-medium text-primary underline"
      >
        {isKo ? "← 브리프로 돌아가기" : "← Back to brief"}
      </button>
    </div>
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

  // persist 복원 전 SSR/CSR 불일치 방지 — 하이드레이션 완료 전엔 step 1.
  // useSyncExternalStore: 서버 스냅샷 false, 클라 복원 시 반응형 전환.
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
        <StepPlaceholder isKo={isKo} onBack={() => setWizardStep(2)} />
      )}
    </div>
  );
}
