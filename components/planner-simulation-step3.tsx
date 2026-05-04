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
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { BtnBlock } from "@/components/brutalist";
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
} from "@/components/planner/composite-preview";
import { usePlannerStore } from "@/lib/planner/store";
import { Move, RotateCcw } from "lucide-react";

type Props = {
  selectedMedia: MediaItem[];
  creativeObjectUrl: string | null;
  setCreativeObjectUrl: Dispatch<SetStateAction<string | null>>;
  creativeUploadedUrl: string | null;
  setCreativeUploadedUrl: (url: string | null) => void;
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
  const mediaPlacements = usePlannerStore((s) => s.mediaPlacements);
  const setMediaPlacement = usePlannerStore((s) => s.setMediaPlacement);
  const clearMediaPlacement = usePlannerStore(
    (s) => s.clearMediaPlacement,
  );

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
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

    // 백그라운드 Cloudinary 업로드
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
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ STEP 5 / LOGO + SIMULATION ]
        </p>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t("stepSimTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("stepSimDesc")}
        </p>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ CREATIVE UPLOAD ]
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
            {t("creativeUploadTitle")}
          </h3>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("creativeUploadDesc")}
          </p>
        </div>
        <div className="p-5">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-stretch">
            <div
              className={cn(
                "relative border-2 p-6 transition-colors",
                creativeObjectUrl
                  ? "border-primary bg-muted"
                  : "border-border bg-muted hover:bg-card",
              )}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <ImageUp className="h-8 w-8 text-primary" aria-hidden />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
                  [ {t("creativeUploadCta")} ]
                </p>
                <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
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
                  <BtnBlock
                    variant="accent"
                    size="md"
                    onClick={() => inputRef.current?.click()}
                    disabled={upload.status === "uploading"}
                  >
                    {upload.status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {t("creativeUploadButton")}
                  </BtnBlock>
                  {creativeObjectUrl || creativeUploadedUrl ? (
                    <BtnBlock
                      variant="secondary"
                      size="md"
                      onClick={clearCreative}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("creativeRemove")}
                    </BtnBlock>
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
                    <div className="h-2 w-full border-2 border-border bg-card">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${upload.pct}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{t("creativeUploadProgress", { pct: upload.pct })}
                    </p>
                  </div>
                ) : upload.status === "done" ? (
                  <p className="mt-3 inline-flex items-center gap-1 border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                    {t("creativeUploadSuccess")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="-ml-[2px] -mt-[2px] space-y-2 border-2 border-border bg-card p-5 lg:mt-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("creativeSpecTitle")} ]
              </p>
              <ul className="space-y-1.5 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                <li>· {t("creativeSpecTypes")}</li>
                <li>· {t("creativeSpecRatio")}</li>
                <li>· {t("creativeSpecTip")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ SIMULATION ]
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
            {t("simViewTitle")}
          </h3>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("simViewDesc")}
          </p>
        </div>
        <div className="p-5">
          {creativeObjectUrl || creativeUploadedUrl ? (
            <div className="mb-4 border-2 border-primary bg-card px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("simCompositeApproxTitle")} ]
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {t("simCompositeApproxBody")}
              </p>
            </div>
          ) : null}
          {mediaCards.length === 0 ? (
            <div className="border-2 border-border bg-muted py-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}{t("simEmpty")}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 썸네일 그리드 — 3개 이상일 때 한눈에 비교 */}
              {mediaCards.length >= 2 ? (
                <div>
                  <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    [ {t("simGridLabel")} ]
                  </p>
                  <ul className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-4">
                    {mediaCards.map((m, i) => (
                      <li key={m.id} className="-mt-[2px] -ml-[2px]">
                        <button
                          type="button"
                          className={cn(
                            "block w-full overflow-hidden border-2 transition-colors",
                            i === slideIndex
                              ? "border-primary"
                              : "border-border hover:border-primary",
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
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ {t("simPerMediaLabel")} ]
                </p>
                <div className="flex items-center gap-2">
                  {(creativeObjectUrl || creativeUploadedUrl) && current ? (
                    <>
                      <BtnBlock
                        variant={editing ? "accent" : "secondary"}
                        size="sm"
                        onClick={() => setEditing((v) => !v)}
                      >
                        <Move className="h-3 w-3" aria-hidden />
                        {editing ? t("editLogoDone") : t("editLogo")}
                      </BtnBlock>
                      {editing && mediaPlacements[current.id] ? (
                        <BtnBlock
                          variant="secondary"
                          size="sm"
                          onClick={() => clearMediaPlacement(current.id)}
                          aria-label={t("editLogoReset")}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden />
                        </BtnBlock>
                      ) : null}
                    </>
                  ) : null}
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
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
                  className="absolute left-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={slideIndex >= maxIdx}
                  aria-label={t("simNext")}
                  className="absolute right-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="overflow-hidden border-2 border-border bg-muted">
                  <AnimatePresence
                    initial={false}
                    custom={slideDir === 0 ? 1 : slideDir}
                    mode="wait"
                  >
                    {current ? (
                      <motion.div
                        key={current.id}
                        custom={slideDir === 0 ? 1 : slideDir}
                        variants={{
                          enter: (dir: number) => ({
                            x: dir > 0 ? 56 : -56,
                            opacity: 0,
                          }),
                          center: { x: 0, opacity: 1 },
                          exit: (dir: number) => ({
                            x: dir < 0 ? 56 : -56,
                            opacity: 0,
                          }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          duration: 0.28,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.85}
                        onDragEnd={onSlideDragEnd}
                        className="touch-pan-y"
                      >
                        <CompositePreview
                          mediaImageUrl={current.url}
                          mediaName={current.name}
                          logoUrl={
                            creativeUploadedUrl || creativeObjectUrl
                          }
                          placement={
                            mediaPlacements[current.id] ??
                            DEFAULT_LOGO_PLACEMENT
                          }
                          editable={editing}
                          onPlacementChange={(next) =>
                            setMediaPlacement(current.id, next)
                          }
                          missingLabel={t("mediaPhotoMissing")}
                          badgeLabel={t("simBadge")}
                          className="rounded-none"
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {`// `}{t("simSwipeHint")}
              </p>

              <div className="flex flex-wrap justify-center gap-1">
                {mediaCards.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSlideDir((i > slideIndex ? 1 : -1) as 1 | -1);
                      setSlideIndex(i);
                    }}
                    className={cn(
                      "h-3 border-2 border-border transition-all",
                      i === slideIndex
                        ? "w-8 bg-primary"
                        : "w-3 bg-card hover:bg-muted",
                    )}
                    aria-label={t("simDotLabel", { n: i + 1 })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

