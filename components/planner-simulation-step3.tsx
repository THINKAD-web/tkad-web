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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <h2 className="text-lg font-bold text-navy sm:text-xl">
          {t("stepSimTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("stepSimDesc")}</p>
      </div>

      <Card className="border-navy/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-navy">{t("creativeUploadTitle")}</CardTitle>
          <CardDescription>{t("creativeUploadDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
            <div
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 border-dashed p-5 transition-colors",
                creativeObjectUrl
                  ? "border-gold/40 bg-gold/5"
                  : "border-navy/15 bg-slate-50/60 hover:border-navy/25",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(232,213,181,0.14),transparent_55%)] opacity-0 transition group-hover:opacity-100" />
              <div className="relative flex flex-col items-center justify-center gap-2 text-center">
                <ImageUp className="h-7 w-7 text-gold" aria-hidden />
                <p className="text-sm font-semibold text-navy">
                  {t("creativeUploadCta")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("creativeUploadHint")}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept={PLANNER_CREATIVE_ACCEPTED_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    className="btn-gold rounded-full px-5 font-semibold"
                    onClick={() => inputRef.current?.click()}
                    disabled={upload.status === "uploading"}
                  >
                    {upload.status === "uploading" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {t("creativeUploadButton")}
                  </Button>
                  {creativeObjectUrl || creativeUploadedUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-navy/20"
                      onClick={clearCreative}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("creativeRemove")}
                    </Button>
                  ) : null}
                </div>

                {upload.status === "uploading" ? (
                  <div
                    className="mt-3 w-full max-w-xs"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={upload.pct}
                  >
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gold transition-all"
                        style={{ width: `${upload.pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("creativeUploadProgress", { pct: upload.pct })}
                    </p>
                  </div>
                ) : upload.status === "done" ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {t("creativeUploadSuccess")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-navy/10 bg-white p-4">
              <p className="text-sm font-bold text-navy">
                {t("creativeSpecTitle")}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>{t("creativeSpecTypes")}</li>
                <li>{t("creativeSpecRatio")}</li>
                <li>{t("creativeSpecTip")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-navy/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-navy">{t("simViewTitle")}</CardTitle>
          <CardDescription>{t("simViewDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {creativeObjectUrl || creativeUploadedUrl ? (
            <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-navy shadow-sm">
              <p className="font-semibold text-navy">
                {t("simCompositeApproxTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-navy/80">
                {t("simCompositeApproxBody")}
              </p>
            </div>
          ) : null}
          {mediaCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/15 bg-slate-50/60 py-12 text-center text-sm text-muted-foreground">
              {t("simEmpty")}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 썸네일 그리드 — 3개 이상일 때 한눈에 비교 */}
              {mediaCards.length >= 2 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t("simGridLabel")}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {mediaCards.map((m, i) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full overflow-hidden rounded-lg border-2 transition",
                            i === slideIndex
                              ? "border-gold shadow-md"
                              : "border-transparent hover:border-gold/40",
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
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("simPerMediaLabel")}
                </p>
                <div className="flex items-center gap-2">
                  {(creativeObjectUrl || creativeUploadedUrl) && current ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant={editing ? "default" : "outline"}
                        className={cn(
                          "h-7 rounded-full px-3 text-[11px]",
                          editing && "btn-gold border-0",
                        )}
                        onClick={() => setEditing((v) => !v)}
                      >
                        <Move className="mr-1 h-3 w-3" aria-hidden />
                        {editing ? t("editLogoDone") : t("editLogo")}
                      </Button>
                      {editing && mediaPlacements[current.id] ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-2 text-[11px] border-navy/20"
                          onClick={() => clearMediaPlacement(current.id)}
                          aria-label={t("editLogoReset")}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden />
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  <p className="text-xs font-bold text-navy">
                    {t("simCounter", {
                      current: slideIndex + 1,
                      total: mediaCards.length,
                    })}
                  </p>
                </div>
              </div>

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-1 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-white/40 bg-black/35 text-white shadow-md backdrop-blur-sm hover:bg-black/45 disabled:opacity-30"
                  onClick={goPrev}
                  disabled={slideIndex <= 0}
                  aria-label={t("simPrev")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-1 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-white/40 bg-black/35 text-white shadow-md backdrop-blur-sm hover:bg-black/45 disabled:opacity-30"
                  onClick={goNext}
                  disabled={slideIndex >= maxIdx}
                  aria-label={t("simNext")}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <div className="overflow-hidden rounded-2xl border border-navy/10 bg-slate-100 shadow-inner">
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

              <p className="text-center text-xs text-muted-foreground">
                {t("simSwipeHint")}
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {mediaCards.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSlideDir((i > slideIndex ? 1 : -1) as 1 | -1);
                      setSlideIndex(i);
                    }}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      i === slideIndex
                        ? "w-8 bg-gold"
                        : "w-2.5 bg-navy/20 hover:bg-navy/35",
                    )}
                    aria-label={t("simDotLabel", { n: i + 1 })}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

