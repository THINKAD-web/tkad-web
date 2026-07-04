"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import {
  PLANNER_CREATIVE_ACCEPTED_TYPES,
  uploadPlannerCreative,
  validateCreativeFile,
} from "@/lib/planner/creative-upload";
import { useToast } from "@/components/toast-provider";
import {
  CompositePreview,
  DEFAULT_LOGO_PLACEMENT,
  type CompositeLogoPlacement,
} from "@/components/planner/composite-preview";
import { usePlannerStore } from "@/lib/planner/store";
import { Move, RotateCcw } from "lucide-react";

const PlannerSimulationSlideDeck = dynamic(
  () =>
    import("@/components/planner/planner-simulation-slide-deck").then((m) => ({
      default: m.PlannerSimulationSlideDeck,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-shimmer aspect-[4/3] w-full rounded-none bg-muted/40" />
    ),
  },
);

type Props = {
  selectedMedia: MediaItem[];
  creativeObjectUrl: string | null;
  setCreativeObjectUrl: Dispatch<SetStateAction<string | null>>;
  creativeUploadedUrl: string | null;
  setCreativeUploadedUrl: (url: string | null) => void;
  /** 통합 플래너 등 외부 store 사용 시 placement 오버라이드 */
  mediaPlacements?: Record<string, CompositeLogoPlacement>;
  setMediaPlacement?: (mediaId: string, placement: CompositeLogoPlacement) => void;
  clearMediaPlacement?: (mediaId: string) => void;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; pct: number }
  | { status: "done" }
  | { status: "error"; message: string };

function mediaSimulationPhotoUrl(m: MediaItem): string | null {
  const primary = getPrimaryMediaImageUrl(m);
  if (primary) return primary;
  const g = resolveMediaGallery(m);
  return g[0] ?? null;
}

const SWIPE_DRAG_THRESHOLD = 72;

export default function PlannerSimulationStep3({
  selectedMedia,
  creativeObjectUrl,
  setCreativeObjectUrl,
  creativeUploadedUrl,
  setCreativeUploadedUrl,
  mediaPlacements: mediaPlacementsProp,
  setMediaPlacement: setMediaPlacementProp,
  clearMediaPlacement: clearMediaPlacementProp,
}: Props) {
  const t = useTranslations("planner");
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<0 | 1 | -1>(0);
  const [upload, setUpload] = useState<UploadState>(
    creativeUploadedUrl ? { status: "done" } : { status: "idle" },
  );
  const [editing, setEditing] = useState(false);
  const storePlacements = usePlannerStore((s) => s.mediaPlacements);
  const storeSetPlacement = usePlannerStore((s) => s.setMediaPlacement);
  const storeClearPlacement = usePlannerStore((s) => s.clearMediaPlacement);
  const mediaPlacements = mediaPlacementsProp ?? storePlacements;
  const setMediaPlacement = setMediaPlacementProp ?? storeSetPlacement;
  const clearMediaPlacement = clearMediaPlacementProp ?? storeClearPlacement;

  const mediaCards = useMemo(
    () =>
      selectedMedia.map((m) => ({
        id: m.id,
        name: m.name,
        url: mediaSimulationPhotoUrl(m),
      })),
    [selectedMedia],
  );

  const maxIdx = Math.max(0, mediaCards.length - 1);

  // slideIndex 가 새 maxIdx 범위를 초과하면 render 단계에서 즉시 보정 (effect 불필요)
  if (slideIndex > maxIdx) {
    setSlideIndex(maxIdx);
  }

  const goPrev = useCallback(() => {
    setSlideIndex((i) => {
      if (i <= 0) return i;
      setSlideDir(-1);
      return i - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((i) => {
      if (i >= maxIdx) return i;
      setSlideDir(1);
      return i + 1;
    });
  }, [maxIdx]);

  const onSlideDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
      const { offset, velocity } = info;
      if (
        (offset.x < -SWIPE_DRAG_THRESHOLD || velocity.x < -420) &&
        slideIndex < maxIdx
      ) {
        goNext();
      } else if (
        (offset.x > SWIPE_DRAG_THRESHOLD || velocity.x > 420) &&
        slideIndex > 0
      ) {
        goPrev();
      }
    },
    [goNext, goPrev, slideIndex, maxIdx],
  );

  const current = mediaCards[slideIndex];

  const clearCreative = useCallback(() => {
    setCreativeObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCreativeUploadedUrl(null);
    setUpload({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }, [setCreativeObjectUrl, setCreativeUploadedUrl]);

  useEffect(() => {
    return () => {
      if (creativeObjectUrl) URL.revokeObjectURL(creativeObjectUrl);
    };
  }, [creativeObjectUrl]);

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    const validation = validateCreativeFile(file);
    if (validation) {
      const key =
        validation === "type"
          ? "creativeUploadErrorType"
          : validation === "size"
            ? "creativeUploadErrorSize"
            : "creativeUploadError";
      toast("error", t(key));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // 즉시 로컬 미리보기
    setCreativeObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    // 백그라운드 Bunny 업로드
    setUpload({ status: "uploading", pct: 0 });
    try {
      const result = await uploadPlannerCreative(file, {
        onProgress: (pct) => setUpload({ status: "uploading", pct }),
      });
      setCreativeUploadedUrl(result.secureUrl);
      setUpload({ status: "done" });
      toast("success", t("creativeUploadSuccess"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "upload failed";
      setCreativeUploadedUrl(null);
      setUpload({ status: "error", message });
      toast("error", t("creativeUploadError"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <PlannerNeonLabel>Step 5 / Logo + Simulation</PlannerNeonLabel>
        <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
          {t("stepSimTitle")}
        </h2>
        <p className={plannerNeon.subtext}>{t("stepSimDesc")}</p>
      </div>

      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>Creative Upload</PlannerNeonLabel>
          <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
            {t("creativeUploadTitle")}
          </h3>
          <p className={cn("mt-1", plannerNeon.subtext)}>
            {t("creativeUploadDesc")}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-stretch">
            <div
              className={cn(
                "relative rounded-xl border p-6 transition-colors",
                creativeObjectUrl
                  ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
                  : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 hover:border-violet-300/40",
              )}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <ImageUp className="h-8 w-8 text-violet-400" aria-hidden />
                <p className={cn("text-sm font-semibold", plannerNeon.headline)}>
                  {t("creativeUploadCta")}
                </p>
                <p className={cn("text-xs", plannerNeon.subtext)}>
                  {t("creativeUploadHint")}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept={PLANNER_CREATIVE_ACCEPTED_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={upload.status === "uploading"}
                    className={cn(
                      plannerNeon.cta,
                      "disabled:opacity-50",
                    )}
                  >
                    {upload.status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {t("creativeUploadButton")}
                  </button>
                  {creativeObjectUrl || creativeUploadedUrl ? (
                    <button
                      type="button"
                      onClick={clearCreative}
                      className={cn(
                        plannerNeon.selectChip,
                        plannerNeon.selectChipIdle,
                        "px-4 py-2",
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("creativeRemove")}
                    </button>
                  ) : null}
                </div>

                {upload.status === "uploading" ? (
                  <div
                    className="mt-4 w-full max-w-xs"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={upload.pct}
                  >
                    <div className="h-2 w-full overflow-hidden rounded-full dark:bg-white/10 bg-gray-200">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                        style={{ width: `${upload.pct}%` }}
                      />
                    </div>
                    <p className={cn("mt-1 text-xs", plannerNeon.subtext)}>
                      {t("creativeUploadProgress", { pct: upload.pct })}
                    </p>
                  </div>
                ) : upload.status === "done" ? (
                  <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    <Check className="h-3 w-3" aria-hidden />
                    {t("creativeUploadSuccess")}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                plannerNeon.card,
                "space-y-2 p-5 lg:mt-0",
              )}
            >
              <PlannerNeonLabel>{t("creativeSpecTitle")}</PlannerNeonLabel>
              <ul className={cn("space-y-1.5 text-xs leading-relaxed", plannerNeon.subtext)}>
                <li>· {t("creativeSpecTypes")}</li>
                <li>· {t("creativeSpecRatio")}</li>
                <li>· {t("creativeSpecTip")}</li>
              </ul>
            </div>
          </div>
        </div>
      </PlannerNeonCard>

      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>Simulation</PlannerNeonLabel>
          <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
            {t("simViewTitle")}
          </h3>
          <p className={cn("mt-1", plannerNeon.subtext)}>{t("simViewDesc")}</p>
        </div>
        <div className="p-5 sm:p-6">
          {creativeObjectUrl || creativeUploadedUrl ? (
            <div className="mb-4 rounded-xl border dark:border-violet-500/30 border-violet-200 dark:bg-violet-500/10 bg-violet-50 px-4 py-3">
              <PlannerNeonLabel>{t("simCompositeApproxTitle")}</PlannerNeonLabel>
              <p className={cn("mt-1 text-sm leading-relaxed", plannerNeon.subtext)}>
                {t("simCompositeApproxBody")}
              </p>
            </div>
          ) : null}
          {mediaCards.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border py-12 text-center text-sm",
                "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50",
                plannerNeon.subtext,
              )}
            >
              {t("simEmpty")}
            </div>
          ) : (
            <div className="space-y-6">
              {mediaCards.length >= 2 ? (
                <div>
                  <PlannerNeonLabel className="mb-3 block">
                    {t("simGridLabel")}
                  </PlannerNeonLabel>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {mediaCards.map((m, i) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={cn(
                            "block w-full overflow-hidden rounded-xl border-2 transition-colors",
                            i === slideIndex
                              ? "border-violet-400"
                              : "dark:border-white/10 border-gray-200 hover:border-violet-300/50",
                          )}
                          onClick={() => {
                            setSlideDir((i > slideIndex ? 1 : -1) as 1 | -1);
                            setSlideIndex(i);
                          }}
                          aria-current={i === slideIndex ? "true" : undefined}
                          aria-label={m.name}
                        >
                          <CompositePreview
                            mediaImageUrl={m.url}
                            mediaName={m.name}
                            logoUrl={
                              creativeUploadedUrl || creativeObjectUrl
                            }
                            placement={
                              mediaPlacements[m.id] ?? DEFAULT_LOGO_PLACEMENT
                            }
                            compact
                            missingLabel={t("mediaPhotoMissing")}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <PlannerNeonLabel>{t("simPerMediaLabel")}</PlannerNeonLabel>
                <div className="flex items-center gap-2">
                  {(creativeObjectUrl || creativeUploadedUrl) && current ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing((v) => !v)}
                        className={cn(
                          plannerNeon.selectChip,
                          editing
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                          "px-3 py-1.5 text-xs",
                        )}
                      >
                        <Move className="mr-1 inline h-3 w-3" aria-hidden />
                        {editing ? t("editLogoDone") : t("editLogo")}
                      </button>
                      {editing && mediaPlacements[current.id] ? (
                        <button
                          type="button"
                          onClick={() => clearMediaPlacement(current.id)}
                          aria-label={t("editLogoReset")}
                          className={cn(
                            plannerNeon.selectChip,
                            plannerNeon.selectChipIdle,
                            "px-2 py-1.5",
                          )}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden />
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  <p className={cn("text-xs font-bold tabular-nums", plannerNeon.headline)}>
                    {t("simCounter", {
                      current: slideIndex + 1,
                      total: mediaCards.length,
                    })}
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={slideIndex <= 0}
                  aria-label={t("simPrev")}
                  className="absolute left-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/10 bg-white/90 text-foreground transition-colors hover:border-violet-400/50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={slideIndex >= maxIdx}
                  aria-label={t("simNext")}
                  className="absolute right-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/10 bg-white/90 text-foreground transition-colors hover:border-violet-400/50 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="overflow-hidden rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100">
                  <PlannerSimulationSlideDeck
                    current={current}
                    slideDir={slideDir}
                    editing={editing}
                    creativeUploadedUrl={creativeUploadedUrl}
                    creativeObjectUrl={creativeObjectUrl}
                    mediaPlacements={mediaPlacements}
                    defaultPlacement={DEFAULT_LOGO_PLACEMENT}
                    onSlideDragEnd={onSlideDragEnd}
                    onPlacementChange={setMediaPlacement}
                    missingLabel={t("mediaPhotoMissing")}
                    badgeLabel={t("simBadge")}
                  />
                </div>
              </div>

              <p className={cn("text-center text-xs", plannerNeon.subtext)}>
                {t("simSwipeHint")}
              </p>

              <div className="flex flex-wrap justify-center gap-1.5">
                {mediaCards.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSlideDir((i > slideIndex ? 1 : -1) as 1 | -1);
                      setSlideIndex(i);
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === slideIndex
                        ? "w-8 bg-gradient-to-r from-violet-500 to-cyan-400"
                        : "w-2 dark:bg-white/20 bg-gray-300 hover:bg-violet-400/50",
                    )}
                    aria-label={t("simDotLabel", { n: i + 1 })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PlannerNeonCard>
    </div>
  );
}

