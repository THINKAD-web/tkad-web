"use client";

/**
 * PR-6c 통합 플래너 3단계 흐름 — `/planner` 메인.
 * L-1/L-2: 브리프·믹스 세션 경계 + 재진입 확인.
 *
 * N-1: React 19 + zustand — selector가 매 getSnapshot마다 새 객체를
 * 반환하면 useSyncExternalStore 무한 루프. boolean selector만 사용한다.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  BRIEF_HANDOFF_QUERY_KEYS,
  planCartToBriefHandoff,
  resolveBriefHandoff,
  resolveHandoffMix,
  savedPlannerPlanToBriefHandoff,
} from "@/lib/planner/brief/handoff";
import { getPlanCart } from "@/lib/plan-cart";
import { useToast } from "@/components/toast-provider";
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

  // ── 딥링크 인계 (매체 상세·비교·찜·내 플랜·챗봇) ──
  const { toast } = useToast();
  const handoff = useMemo(
    () =>
      resolveBriefHandoff({
        plan: searchParams.get("plan"),
        loadPlan: searchParams.get("loadPlan"),
        from: searchParams.get("from"),
        brief: searchParams.get("brief"),
        mediaIds: searchParams.get("mediaIds"),
        addMedia: searchParams.get("addMedia"),
        units: searchParams.get("units"),
      }),
    [searchParams],
  );
  // `savedPlan` 은 Step 3 이 ?plan= 으로 이미 처리한다 — 여기선 인계로 세지 않는다.
  const pendingHandoff = handoff && handoff.kind !== "savedPlan" ? handoff : null;
  const handledHandoffRef = useRef<string | null>(null);

  // L-2: hydration 직후 1회만 — mixCount를 effect deps에 넣지 않는다.
  useLayoutEffect(() => {
    if (resumePromptedRef.current) return;
    const state = useBriefStore.getState();
    const shouldOpen = shouldPromptResumeSession({
      hydrated,
      planFromUrl,
      alreadyPrompted: resumePromptedRef.current,
      mixUnits: state.mixUnits,
      handoffActive: pendingHandoff != null,
    });
    if (!shouldOpen) return;
    resumePromptedRef.current = true;
    setResumeOpen(true);
  }, [hydrated, planFromUrl, pendingHandoff]);

  const stripHandoffQuery = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    for (const k of BRIEF_HANDOFF_QUERY_KEYS) url.searchParams.delete(k);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const noticeMissing = useCallback(
    (missing: readonly string[]) => {
      if (missing.length === 0) return;
      toast(
        "warning",
        isKo
          ? `매체 ${missing.length}개는 현재 카탈로그에 없어 제외했습니다.`
          : `${missing.length} media are no longer in the catalog and were skipped.`,
      );
    },
    [toast, isKo],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!pendingHandoff) return;
    const key = JSON.stringify(pendingHandoff);
    if (handledHandoffRef.current === key) return;
    handledHandoffRef.current = key;

    const store = useBriefStore.getState();
    let cancelled = false;

    const applyStartFrom = (
      result: ReturnType<typeof planCartToBriefHandoff>,
      emptyMessage: string,
      okMessage: (n: number) => string,
    ) => {
      store.startFromHandoff({ patch: result.patch, lines: result.mix.lines });
      noticeMissing(result.mix.missing);
      if (result.mix.lines.length > 0) {
        setWizardStep(2);
        toast("success", okMessage(result.mix.lines.length));
      } else {
        setWizardStep(1);
        toast("success", emptyMessage);
      }
      stripHandoffQuery();
    };

    void (async () => {
      switch (pendingHandoff.kind) {
        case "media": {
          const { lines, missing } = resolveHandoffMix({
            catalog,
            mediaIds: pendingHandoff.mediaIds,
            units: pendingHandoff.units,
          });
          noticeMissing(missing);
          if (lines.length === 0) {
            toast(
              "error",
              isKo
                ? "선택한 매체를 찾을 수 없습니다."
                : "Selected media not found.",
            );
            stripHandoffQuery();
            return;
          }
          store.addMixLines(lines);
          setWizardStep(2);
          toast(
            "success",
            isKo
              ? `매체 ${lines.length}개를 담았습니다. 수량을 확인한 뒤 진행해 주세요.`
              : `Added ${lines.length} media. Check quantities, then continue.`,
          );
          stripHandoffQuery();
          return;
        }

        case "brief": {
          store.applyFreeText(pendingHandoff.raw);
          store.setFreeText(pendingHandoff.raw);
          setWizardStep(1);
          toast(
            "success",
            isKo
              ? "입력한 조건으로 채웠습니다. 확인 후 다음 단계로 진행해 주세요."
              : "Brief applied — review it, then continue.",
          );
          stripHandoffQuery();
          return;
        }

        case "planCart": {
          applyStartFrom(
            planCartToBriefHandoff(getPlanCart(), catalog),
            isKo
              ? "내 플랜 설정으로 플래너를 시작합니다."
              : "Starting the planner with your saved plan settings.",
            (n) =>
              isKo
                ? `내 플랜 매체 ${n}개로 시작합니다.`
                : `Starting with ${n} media from your plan.`,
          );
          return;
        }

        case "loadPlan": {
          try {
            const res = await fetch(
              `/api/planner/shared/${encodeURIComponent(pendingHandoff.planId)}`,
              { cache: "no-store" },
            );
            if (!res.ok) throw new Error(String(res.status));
            const data = (await res.json()) as { planJson?: unknown };
            if (cancelled) return;
            applyStartFrom(
              savedPlannerPlanToBriefHandoff(
                (data.planJson ?? {}) as Parameters<
                  typeof savedPlannerPlanToBriefHandoff
                >[0],
                catalog,
              ),
              isKo
                ? "저장한 플랜 설정을 불러왔습니다."
                : "Loaded your saved plan settings.",
              (n) =>
                isKo
                  ? `저장한 플랜의 매체 ${n}개를 불러왔습니다.`
                  : `Loaded ${n} media from your saved plan.`,
            );
          } catch {
            if (cancelled) return;
            toast(
              "error",
              isKo
                ? "플랜을 불러오지 못했습니다. 만료되었을 수 있습니다."
                : "Could not load the plan — it may have expired.",
            );
            stripHandoffQuery();
          }
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    pendingHandoff,
    catalog,
    isKo,
    setWizardStep,
    stripHandoffQuery,
    noticeMissing,
    toast,
  ]);

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
