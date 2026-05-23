"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, FileUp, Loader2, Trash2 } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import {
  CREATIVE_ACCEPT_ATTR,
  classifyMime,
  specRowForType,
  validateCreativeBasics,
  type CreativeSpecRow,
} from "@/lib/creatives/spec-guide";
import {
  deriveVideoThumbnail,
  readImageDimensions,
  readVideoMeta,
  uploadCreativeToCloudinary,
} from "@/lib/creatives/upload-client";
import type { MediaItem } from "@/lib/media-data";

type Props = {
  /** 매체 사전 선택 → 권장 규격 강조 (옵션) */
  preselectedMedia?: Pick<MediaItem, "id" | "name" | "type" | "widthM" | "heightM" | "resolution">;
  catalogMinimal?: Array<{ id: string; name: string; type: string }>;
  defaultName?: string;
  /** 업로드 + DB 저장 완료 시 호출됨. 빈 콜백이면 라이브러리로 이동. */
  onCreated?: (creativeId: string) => void;
};

export function CreativeUploader({
  preselectedMedia,
  catalogMinimal,
  defaultName,
  onCreated,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [mediaTypeKey, setMediaTypeKey] = useState<string>(
    preselectedMedia?.type ?? "default",
  );
  const spec: CreativeSpecRow = useMemo(
    () => specRowForType(mediaTypeKey),
    [mediaTypeKey],
  );

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    kind: "image" | "video";
    width: number | null;
    height: number | null;
    duration: number | null;
  } | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = useCallback(
    async (f: File) => {
      const kind = classifyMime(f.type);
      if (!kind) {
        toast(
          "warning",
          "지원 형식이 아닙니다. JPG/PNG/GIF 이미지 또는 MP4/MOV 영상만 가능합니다.",
        );
        return;
      }
      const baseIssues = validateCreativeBasics({ file: f, spec });
      setIssues(baseIssues.map((i) => i.message));

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setFile(f);
      if (!name.trim()) {
        const stripped = f.name.replace(/\.[^/.]+$/, "");
        setName(stripped.slice(0, 80));
      }

      if (kind === "image") {
        const dim = await readImageDimensions(f);
        setMeta({
          kind: "image",
          width: dim?.width ?? null,
          height: dim?.height ?? null,
          duration: null,
        });
      } else {
        const m = await readVideoMeta(f);
        setMeta({
          kind: "video",
          width: m?.width ?? null,
          height: m?.height ?? null,
          duration: m?.duration ?? null,
        });
      }
    },
    [name, previewUrl, spec, toast],
  );

  const resetAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setName("");
    setTags([]);
    setTagInput("");
    setPreviewUrl(null);
    setMeta(null);
    setProgress(null);
    setIssues([]);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    if (tags.length >= 12) return;
    setTags([...tags, t.slice(0, 30)]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((cur) => cur.filter((x) => x !== t));

  const handleSubmit = async () => {
    if (!file) return;
    if (!name.trim()) {
      toast("warning", "소재 이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setProgress(0);
    try {
      const cloud = await uploadCreativeToCloudinary(file, (p) => setProgress(p));

      const thumbnailUrl =
        cloud.resourceType === "video" && cloud.publicId
          ? deriveVideoThumbnail({ cloudName: extractCloudFromUrl(cloud.secureUrl) ?? "", publicId: cloud.publicId })
          : null;

      const res = await fetch("/api/my/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: cloud.resourceType,
          url: cloud.secureUrl,
          publicId: cloud.publicId || null,
          fileName: file.name,
          width: cloud.width ?? meta?.width ?? null,
          height: cloud.height ?? meta?.height ?? null,
          fileSize: cloud.bytes ?? file.size,
          duration: cloud.duration ?? meta?.duration ?? null,
          thumbnailUrl,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast(
          "error",
          data?.error?.message ?? "DB 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
      toast("success", "소재를 업로드했습니다.");
      if (onCreated) {
        onCreated(data.data.id);
      } else {
        router.push("/creatives");
      }
    } catch (e) {
      toast(
        "error",
        e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        {/* 매체 유형 선택 */}
        <div>
          <p className="mb-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            [ 매체 유형 선택 ]
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            선택한 매체 유형의 권장 규격을 자동으로 적용합니다.
          </p>
          <select
            value={mediaTypeKey}
            onChange={(e) => setMediaTypeKey(e.target.value)}
            className="h-11 w-full rounded-md border-2 border-border bg-card px-3 text-sm font-semibold text-foreground focus:border-accent focus:outline-none"
          >
            {KNOWN_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
            {catalogMinimal && catalogMinimal.length > 0
              ? null /* (향후 특정 매체 ID 지정 모드를 추가할 수 있음) */
              : null}
          </select>
          <SpecPreview spec={spec} />
        </div>

        {/* 파일 선택 */}
        <div>
          <p className="mb-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            [ 파일 ]
          </p>
          <label
            htmlFor="creative-file-input"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-accent hover:bg-accent/5",
              file ? "border-accent bg-accent/5" : null,
            )}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {file ? file.name : "이미지 또는 영상 파일을 선택하세요"}
            </span>
            <span className="font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {spec.stillFormats.join(" / ")}
              {spec.videoFormats?.length ? ` · ${spec.videoFormats.join(" / ")}` : ""}
              {" · "}최대 {spec.maxFileMB}MB
            </span>
            <input
              id="creative-file-input"
              type="file"
              accept={CREATIVE_ACCEPT_ATTR}
              className="sr-only"
              disabled={submitting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {issues.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-[12px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {issues.map((i) => (
                <li key={i}>· {i}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {file ? (
          <>
            <div>
              <p className="mb-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ 소재 이름 ]
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-11 w-full rounded-md border-2 border-border bg-card px-3 text-sm font-semibold text-foreground focus:border-accent focus:outline-none"
                placeholder="예: 2026 봄 캠페인 메인"
              />
            </div>

            <div>
              <p className="mb-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ 태그 ]
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => removeTag(t)}
                    className="inline-flex items-center gap-1 rounded-md border-2 border-border bg-muted px-2 py-1 font-display text-xs font-medium uppercase tracking-[0.14em] text-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    #{t}
                    <Trash2 className="h-3 w-3" />
                  </button>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="태그 추가 (Enter)"
                    maxLength={30}
                    className="h-7 w-40 rounded-md border-2 border-dashed border-border bg-card px-2 text-[11px] focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <BtnBlock
                variant="accent"
                size="md"
                onClick={handleSubmit}
                disabled={submitting || issues.some((m) => m.includes("초과"))}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    업로드 중{progress != null ? ` ${progress}%` : ""}…
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    업로드하기
                  </>
                )}
              </BtnBlock>
              <BtnBlock variant="secondary" size="md" onClick={resetAll} disabled={submitting}>
                <Trash2 className="h-4 w-4" /> 다시 선택
              </BtnBlock>
            </div>
          </>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border-2 border-border bg-muted/40 p-4 sm:p-5">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            [ 미리보기 ]
          </p>
          <div className="mt-3 aspect-[16/10] w-full overflow-hidden rounded-2xl border-2 border-border dark:bg-black bg-white dark:bg-white/5 bg-gray-50 bg-white/30">
            {previewUrl ? (
              meta?.kind === "video" ? (
                <video
                  src={previewUrl}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                파일을 선택하면 미리보기가 표시됩니다
              </div>
            )}
          </div>
          {meta ? (
            <dl className="mt-3 grid grid-cols-2 gap-2 font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Row label="유형" value={meta.kind === "video" ? "영상" : "이미지"} />
              <Row label="크기" value={file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—"} />
              <Row
                label="해상도"
                value={meta.width && meta.height ? `${meta.width}×${meta.height}` : "—"}
              />
              {meta.kind === "video" ? (
                <Row label="길이" value={meta.duration ? `${meta.duration}s` : "—"} />
              ) : null}
            </dl>
          ) : null}
        </div>

        {preselectedMedia ? (
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4 sm:p-5">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
              [ 선택된 매체 ]
            </p>
            <p className="mt-2 text-sm font-bold text-foreground">{preselectedMedia.name}</p>
            <p className="mt-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {preselectedMedia.widthM && preselectedMedia.heightM
                ? `${(preselectedMedia.widthM * 100).toFixed(0)}×${(preselectedMedia.heightM * 100).toFixed(0)}cm`
                : preselectedMedia.resolution ?? "—"}
            </p>
            <div className="mt-3 inline-flex items-center gap-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
              <CheckCircle2 className="h-3 w-3" /> 규격 자동 적용 완료
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground/70">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function SpecPreview({ spec }: { spec: CreativeSpecRow }) {
  return (
    <div className="mt-3 rounded-xl border-2 border-border bg-card p-3 text-sm">
      <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
        [ {spec.labelKo} 권장 규격 ]
      </p>
      <ul className="mt-2 space-y-1 text-[12px] text-foreground/85">
        <li>· 해상도: {spec.recommendedResolution}</li>
        <li>· 비율: {spec.aspectRatio}</li>
        <li>· 포맷: {spec.stillFormats.join(" / ")}
          {spec.videoFormats?.length ? ` · ${spec.videoFormats.join(" / ")}` : ""}
        </li>
        <li>· 최대 파일 크기: {spec.maxFileMB}MB</li>
        {spec.videoDurationSec ? (
          <li>· 권장 길이: {spec.videoDurationSec.min}~{spec.videoDurationSec.max}초</li>
        ) : null}
      </ul>
    </div>
  );
}

const KNOWN_TYPES: Array<{ key: string; label: string }> = [
  { key: "billboard", label: "옥외 빌보드 (LED)" },
  { key: "led", label: "LED 전광판" },
  { key: "subway", label: "지하철 (스크린/포스터)" },
  { key: "bus", label: "버스 (래핑/모니터)" },
  { key: "taxi", label: "택시 디지털 사이니지" },
  { key: "elevator", label: "엘리베이터 모니터" },
  { key: "indoor", label: "실내 사이니지" },
  { key: "default", label: "기타 / 알 수 없음" },
];

function extractCloudFromUrl(url: string): string | null {
  const m = url.match(/res\.cloudinary\.com\/([^/]+)\//);
  return m?.[1] ?? null;
}
