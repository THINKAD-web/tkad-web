"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Layers,
  Brush,
  Clock as ClockIcon,
  AlertTriangle,
  Trash2,
  ImageIcon,
  Video,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  QUOTE_CREATIVE_ACCEPTED_TYPES,
  QUOTE_CREATIVE_MAX_BYTES,
  uploadQuoteCreative,
} from "@/lib/quote/creative-upload";
import { useQuoteStore } from "@/lib/quote/store";
import type {
  QuoteCreativeAsset,
  QuoteCreativeMode,
  QuoteDesignBrief,
} from "@/lib/quote/types";
import {
  CompositePreview,
  type CompositeLogoPlacement,
} from "@/components/planner/composite-preview";
import { usePlannerStore } from "@/lib/planner/store";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { Link } from "@/i18n/navigation";

const MODES: ReadonlyArray<{
  key: QuoteCreativeMode;
  icon: typeof Upload;
}> = [
  { key: "upload", icon: Upload },
  { key: "composite", icon: Layers },
  { key: "design_request", icon: Brush },
  { key: "later", icon: ClockIcon },
];

type Props = {
  selectedMedia: MediaItem[];
};

export function QuoteCreativeStep({ selectedMedia }: Props) {
  const t = useTranslations("quote.creative");
  const creativeMode = useQuoteStore((s) => s.creativeMode);
  const setCreativeMode = useQuoteStore((s) => s.setCreativeMode);
  const uploadedAssets = useQuoteStore((s) => s.uploadedAssets);
  const addUploadedAsset = useQuoteStore((s) => s.addUploadedAsset);
  const removeUploadedAsset = useQuoteStore((s) => s.removeUploadedAsset);
  const designBrief = useQuoteStore((s) => s.designBrief);
  const setDesignBrief = useQuoteStore((s) => s.setDesignBrief);
  const setNeedsDesignService = useQuoteStore((s) => s.setNeedsDesignService);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("desc")}</p>

      {/* 4가지 모드 카드 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map(({ key, icon: Icon }) => {
          const active = creativeMode === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCreativeMode(key);
                setNeedsDesignService(key === "design_request");
              }}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                active
                  ? "border-gold bg-gold/5 ring-2 ring-gold/20"
                  : "border-navy/10 hover:border-navy/25",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-6 w-6 shrink-0",
                  active ? "text-gold-dark" : "text-navy",
                )}
                aria-hidden
              />
              <div>
                <p className="font-bold text-navy">{t(`modes.${key}.title`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`modes.${key}.desc`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 모드별 콘텐츠 */}
      {creativeMode === "upload" ? (
        <UploadPanel
          assets={uploadedAssets}
          onAdd={addUploadedAsset}
          onRemove={removeUploadedAsset}
          mediaSpec={selectedMedia}
        />
      ) : null}

      {creativeMode === "composite" ? (
        <CompositePanel media={selectedMedia} />
      ) : null}

      {creativeMode === "design_request" ? (
        <DesignBriefPanel brief={designBrief} onChange={setDesignBrief} />
      ) : null}

      {creativeMode === "later" ? (
        <div className="rounded-xl border border-dashed border-navy/15 bg-slate-50 p-4 text-sm text-muted-foreground">
          {t("modes.later.notice")}
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────── Upload panel ────────────────── */

type UploadPanelProps = {
  assets: QuoteCreativeAsset[];
  onAdd: (asset: QuoteCreativeAsset) => void;
  onRemove: (assetId: string) => void;
  mediaSpec: MediaItem[];
};

function UploadPanel({ assets, onAdd, onRemove, mediaSpec }: UploadPanelProps) {
  const t = useTranslations("quote.creative");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        setProgress(0);
        const res = await uploadQuoteCreative(file, {
          onProgress: (pct) => setProgress(pct),
        });
        const asset: QuoteCreativeAsset = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: res.secureUrl,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        };
        onAdd(asset);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "UPLOAD_FAILED";
        // 에러 키 → i18n
        if (msg.startsWith("INVALID_")) {
          const sub = msg.replace("INVALID_", "").toLowerCase();
          setError(t(`upload.errors.${sub}`));
        } else if (msg.includes("503")) {
          setError(t("upload.errors.serverDisabled"));
        } else {
          setError(t("upload.errors.network"));
        }
      } finally {
        setProgress(null);
      }
    },
    [onAdd, t],
  );

  // 매체 규격 가이드 — 디지털 / 인쇄 매체별 권장 해상도 안내.
  const mediaGuides = useMemo(() => {
    const seen = new Set<string>();
    const guides: { key: string; type: string }[] = [];
    for (const m of mediaSpec) {
      const key =
        m.type === "digital"
          ? "digital"
          : m.type === "static"
            ? "static"
            : null;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      guides.push({ key, type: m.type });
    }
    return guides;
  }, [mediaSpec]);

  return (
    <div className="space-y-4 rounded-xl border border-navy/10 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-navy">{t("upload.title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("upload.hint", {
            mb: Math.round(QUOTE_CREATIVE_MAX_BYTES / 1024 / 1024),
          })}
        </p>
      </div>

      {/* 매체 규격 가이드 */}
      {mediaGuides.length > 0 ? (
        <ul className="rounded-lg border border-navy/5 bg-slate-50 p-3 text-xs text-muted-foreground">
          {mediaGuides.map((g) => (
            <li key={g.key} className="leading-snug">
              <span className="font-medium text-navy">
                {t(`upload.guides.${g.key}.label`)}
              </span>{" "}
              · {t(`upload.guides.${g.key}.spec`)}
            </li>
          ))}
        </ul>
      ) : null}

      {/* 업로드 영역 */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy shadow-sm hover:bg-slate-50">
          <Upload className="h-4 w-4 text-gold" />
          {t("upload.choose")}
          <input
            ref={inputRef}
            type="file"
            accept={QUOTE_CREATIVE_ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </label>
        {progress != null ? (
          <span className="text-xs text-muted-foreground">
            {t("upload.uploading", { pct: progress })}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      ) : null}

      {/* 업로드된 자료 목록 */}
      {assets.length > 0 ? (
        <ul className="space-y-2">
          {assets.map((a) => {
            const isVideo = a.mimeType.startsWith("video/");
            const Icon = isVideo ? Video : ImageIcon;
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-navy/5 bg-slate-50 px-3 py-2"
              >
                <Icon className="h-4 w-4 text-navy/70" aria-hidden />
                <div className="grow truncate">
                  <p className="truncate text-sm font-medium text-navy">
                    {a.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(a.size / 1024).toFixed(0)} KB · {a.mimeType}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(a.id)}
                  aria-label={t("upload.remove")}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-navy/15 px-3 py-3 text-center text-xs text-muted-foreground">
          {t("upload.empty")}
        </p>
      )}
    </div>
  );
}

/* ────────────────── Composite panel (Planner 결과 재사용) ────────────────── */

function CompositePanel({ media }: { media: MediaItem[] }) {
  const t = useTranslations("quote.creative");
  const plannerLogoUrl = usePlannerStore((s) => s.creativeUploadedUrl);
  const placements = usePlannerStore((s) => s.mediaPlacements);

  const hasPlannerLogo = Boolean(plannerLogoUrl);
  const placedCount = useMemo(
    () => Object.keys(placements).filter((id) => media.some((m) => m.id === id)).length,
    [placements, media],
  );

  if (!hasPlannerLogo || placedCount === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {t("composite.missingTitle")}
        </p>
        <p className="text-xs text-amber-900">{t("composite.missingBody")}</p>
        <Link
          href="/planner"
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline hover:text-amber-700"
        >
          {t("composite.goPlanner")}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-navy/10 bg-white p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-navy">
            {t("composite.foundTitle", { count: placedCount })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("composite.foundBody")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media
          .filter((m) => placements[m.id])
          .map((m) => {
            const placement: CompositeLogoPlacement = placements[m.id]!;
            return (
              <CompositePreview
                key={m.id}
                mediaImageUrl={getPrimaryMediaImageUrl(m)}
                mediaName={m.name}
                logoUrl={plannerLogoUrl}
                placement={placement}
                editable={false}
                compact
                className="aspect-video w-full rounded-md"
              />
            );
          })}
      </div>
    </div>
  );
}

/* ────────────────── Design brief panel ────────────────── */

type BriefPanelProps = {
  brief: QuoteDesignBrief | null;
  onChange: (next: QuoteDesignBrief | null) => void;
};

function DesignBriefPanel({ brief, onChange }: BriefPanelProps) {
  const t = useTranslations("quote.creative");
  const value: QuoteDesignBrief = brief ?? {
    brand: "",
    message: "",
    toneAndManner: "",
    referenceUrls: [],
    deadlineIso: null,
  };
  const update = (patch: Partial<QuoteDesignBrief>) =>
    onChange({ ...value, ...patch });

  const refsText = value.referenceUrls.join("\n");

  return (
    <div className="space-y-4 rounded-xl border border-navy/10 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-navy">{t("brief.title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("brief.hint")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="brief-brand"
            className="mb-1 block text-xs font-medium text-navy"
          >
            {t("brief.brand")}
          </label>
          <Input
            id="brief-brand"
            value={value.brand}
            onChange={(e) => update({ brand: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor="brief-deadline"
            className="mb-1 block text-xs font-medium text-navy"
          >
            {t("brief.deadline")}
          </label>
          <Input
            id="brief-deadline"
            type="date"
            value={value.deadlineIso ?? ""}
            onChange={(e) => update({ deadlineIso: e.target.value || null })}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="brief-message"
          className="mb-1 block text-xs font-medium text-navy"
        >
          {t("brief.message")}
        </label>
        <Textarea
          id="brief-message"
          rows={3}
          value={value.message}
          onChange={(e) => update({ message: e.target.value })}
          placeholder={t("brief.messagePlaceholder")}
        />
      </div>
      <div>
        <label
          htmlFor="brief-tone"
          className="mb-1 block text-xs font-medium text-navy"
        >
          {t("brief.tone")}
        </label>
        <Input
          id="brief-tone"
          value={value.toneAndManner}
          onChange={(e) => update({ toneAndManner: e.target.value })}
          placeholder={t("brief.tonePlaceholder")}
        />
      </div>
      <div>
        <label
          htmlFor="brief-refs"
          className="mb-1 block text-xs font-medium text-navy"
        >
          {t("brief.refs")}
        </label>
        <Textarea
          id="brief-refs"
          rows={2}
          value={refsText}
          onChange={(e) => {
            const lines = e.target.value
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean);
            update({ referenceUrls: lines });
          }}
          placeholder={t("brief.refsPlaceholder")}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("brief.feeNotice")}</p>
    </div>
  );
}
