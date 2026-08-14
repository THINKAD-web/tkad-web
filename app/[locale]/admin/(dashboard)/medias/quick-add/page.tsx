"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { CATALOG_MEDIA_TYPES } from "@/lib/media-auto-categorize";
import { typeLabels } from "@/lib/media-data";
import { Input } from "@/components/ui/input";
import {
  mapQuickAddToDb,
  parseQuickAddJsonText,
  validateQuickAddItems,
  type MediaQuickAddCreate,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";
import { adminFetchJson } from "@/lib/admin-client-fetch";

const SAMPLE_JSON = `{
  "media_name": "강남역 인근 디지털 보드",
  "description": "역세권 고유동 노출",
  "sub_category": "디지털",
  "tags": ["강남", "역세권", "MZ"],
  "full_address": "서울 강남구 강남대로 396",
  "district": "강남구",
  "city": "서울",
  "latitude": 37.498,
  "longitude": 127.0276,
  "price_per_month": 3500,
  "price_note": "VAT 별도",
  "width_m": 12.5,
  "height_m": 4.2,
  "resolution": "3840×2160",
  "operating_hours": "06:00–24:00",
  "target_age": "20–40대",
  "effect_memo": "야간 대비 시인성 우수",
  "extracted_images": [
    "https://res.cloudinary.com/demo/image/upload/w_800/sample.jpg"
  ]
}`;

type ParseState =
  | { kind: "empty" }
  | { kind: "syntax"; message: string }
  | { kind: "schema"; message: string }
  | { kind: "ok"; items: QuickAddMediaJson[] };

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function AdminMediaQuickAddPage() {
  const router = useRouter();

  const [text, setText] = useState("");
  const debouncedText = useDebouncedValue(text, 400);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 비우면 자동 분류 */
  const [typeOverride, setTypeOverride] = useState<Record<number, string>>({});
  /** 비우면 JSON tags 기준(미입력 상태는 카드에서 원본 표시) */
  const [tagLines, setTagLines] = useState<Record<number, string>>({});
  const [reclassifyLoading, setReclassifyLoading] = useState(false);
  const [reclassifyMsg, setReclassifyMsg] = useState<string | null>(null);

  useEffect(() => {
    setTypeOverride({});
    setTagLines({});
  }, [debouncedText]);

  const parseState: ParseState = useMemo(() => {
    if (!debouncedText.trim()) return { kind: "empty" };
    const parsed = parseQuickAddJsonText(debouncedText);
    if (!parsed.ok) return { kind: "syntax", message: parsed.error };
    const validated = validateQuickAddItems(parsed.raw);
    if (!validated.ok) return { kind: "schema", message: validated.error };
    return { kind: "ok", items: validated.items };
  }, [debouncedText]);

  const mergedItems: QuickAddMediaJson[] = useMemo(() => {
    if (parseState.kind !== "ok") return [];
    return parseState.items.map((it, i) => {
      const t = typeOverride[i];
      const line = tagLines[i];
      const tagsFromLine =
        line !== undefined
          ? line
              .split(/[,，、]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : null;
      return {
        ...it,
        ...(t ? { type: t } : {}),
        ...(tagsFromLine ? { tags: tagsFromLine } : {}),
      };
    });
  }, [parseState, typeOverride, tagLines]);

  const loadSample = useCallback(() => {
    setText(SAMPLE_JSON);
    setSubmitError(null);
  }, []);

  const onSubmit = async () => {
    if (parseState.kind !== "ok") return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await adminFetchJson("/api/admin/medias/quick-add", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: mergedItems }),
      });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      // 목록 페이지가 bfcache·클라이언트 상태로 옛 데이터를 보이지 않도록 쿼리로 재조회 유도
      router.push(`/admin/medias?updated=${Date.now()}`);
      router.refresh();
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : "요청을 처리하지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runReclassify = async (dryRun: boolean) => {
    setReclassifyLoading(true);
    setReclassifyMsg(null);
    try {
      const result = await adminFetchJson("/api/admin/medias/reclassify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      if (!result.ok) {
        setReclassifyMsg(result.message);
        return;
      }
      const data = result.data as {
        error?: string;
        scanned?: number;
        updated?: number;
        wouldChange?: number;
        dryRun?: boolean;
      };
      setReclassifyMsg(
        data.dryRun
          ? `시뮬: ${data.scanned ?? 0}건 검토, ${data.wouldChange ?? 0}건 유형 변경 예정`
          : `완료: ${data.updated ?? 0}건 유형 업데이트 (${data.scanned ?? 0}건 검토)`,
      );
    } catch (e) {
      setReclassifyMsg(
        e instanceof Error ? e.message : "재분류 요청을 처리하지 못했습니다.",
      );
    } finally {
      setReclassifyLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/medias"
            className="mb-2 inline-flex items-center gap-1 border-b-2 border-border pb-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:text-primary hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            매체 목록
          </Link>
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            [ MEDIA QUICK ADD ]
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            매체 간편 등록 (JSON)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            객체 하나 또는 배열을 붙여넣으면 실시간으로 검증·미리보기됩니다. 등록 시 DB에
            저장되며 매체 관리·미디어 허브에서 동일하게 조회됩니다. 서버에{" "}
            <code className="rounded bg-slate-100 px-1">KAKAO_REST_API_KEY</code>가
            설정되어 있으면 <code className="rounded bg-slate-100 px-1">full_address</code>
            만으로도 위도·경도·시·구를 카카오 주소 API로 자동 보강합니다 (이미 넣은 값은
            덮어쓰지 않습니다). 좌표가 잡히면 500m 이내 지하철역·백화점·쇼핑몰·대학·관광지
            명칭을 모아 <code className="rounded bg-slate-100 px-1">nearby_facilities</code>에
            저장합니다 (<code className="rounded bg-slate-100 px-1">nearby_facilities</code>를
            직접 넣으면 자동 수집은 건너뜁니다).{" "}
            <code className="rounded bg-slate-100 px-1">DATA_GO_KR_SERVICE_KEY</code>가
            있으면 500m 이내 지하철역 승하차(공공데이터)로{" "}
            <code className="rounded bg-slate-100 px-1">daily_footfall</code>을 추정하고,
            없거나 비서울역이면 시·구 단위 상권 휴리스틱으로 채웁니다 (
            <code className="rounded bg-slate-100 px-1">daily_footfall</code>을 이미 넣으면
            덮어쓰지 않습니다). 등록 시{" "}
            <code className="rounded bg-slate-100 px-1">region</code>·
            <code className="rounded bg-slate-100 px-1">type</code>·
            <code className="rounded bg-slate-100 px-1">sub_category</code>·
            <code className="rounded bg-slate-100 px-1">tags</code>는 주소·세부유형·매체명·설명·주변
            필드에서 자동 보강되며, JSON에 넣은 tags는 유지한 채 자동 추출 태그와 합쳐집니다. 선택적으로 JSON에{" "}
            <code className="rounded bg-slate-100 px-1">type</code>을 넣으면 자동 유형 대신 고정합니다 (
            {CATALOG_MEDIA_TYPES.join(", ")}).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadSample}>
          샘플 JSON 넣기
        </Button>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">기존 매체 유형 재분류</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            DB에 있는 단일 매체의 <code className="rounded bg-slate-100 px-1">type</code>을
            매체명·주소·설명·태그 등으로 다시 추론합니다. 네트워크 패키지(
            <code className="rounded bg-slate-100 px-1">nw_*</code>)는 대상이 아닙니다.
          </p>
          {reclassifyMsg ? (
            <p className="border-2 border-border bg-muted/60 px-3 py-2 text-[11px] tracking-tight text-foreground">
              {reclassifyMsg}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reclassifyLoading}
              onClick={() => void runReclassify(true)}
            >
              {reclassifyLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              시뮬레이션
            </Button>
            <Button
              type="button"
              size="sm"
              className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
              disabled={reclassifyLoading}
              onClick={() => {
                if (
                  !window.confirm(
                    "전체 매체에 대해 유형을 재분류합니다. 계속할까요?",
                  )
                ) {
                  return;
                }
                void runReclassify(false);
              }}
            >
              재분류 실행
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">JSON 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSubmitError(null);
            }}
            placeholder='{ "media_name": "...", "full_address": "...", "city": "서울", ... } 또는 [ {...}, {...} ]'
            className="min-h-[420px] text-sm"
            spellCheck={false}
          />
          {parseState.kind === "syntax" && (
            <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseState.message}
            </div>
          )}
          {parseState.kind === "schema" && (
            <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseState.message}
            </div>
          )}
          {parseState.kind === "ok" && (
            <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              파싱 성공 · {parseState.items.length}건
            </div>
          )}
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
          <Button
            type="button"
            className="border-2 border-border bg-primary font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:border-border"
            disabled={parseState.kind !== "ok" || submitting}
            onClick={onSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                등록 중…
              </>
            ) : (
              "등록하기"
            )}
          </Button>
        </CardContent>
      </Card>

      {parseState.kind === "ok" && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            등록 미리보기 (자동 유형·태그)
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            아래 값은 서버에 저장될 때와 동일하게 계산됩니다. 유형·태그(쉼표 구분)를 바꾼 뒤
            등록하면 JSON을 수정하지 않아도 반영됩니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {mergedItems.map((item, idx) => (
              <PreviewCard
                key={`${item.media_name}-${idx}`}
                item={item}
                index={idx}
                preview={mapQuickAddToDb(item)}
                typeValue={typeOverride[idx] ?? ""}
                tagLineValue={
                  tagLines[idx] !== undefined
                    ? tagLines[idx]
                    : parseState.items[idx]!.tags.join(", ")
                }
                onTypeChange={(v) =>
                  setTypeOverride((prev) => {
                    const next = { ...prev };
                    if (!v) delete next[idx];
                    else next[idx] = v;
                    return next;
                  })
                }
                onTagLineChange={(v) =>
                  setTagLines((prev) => ({ ...prev, [idx]: v }))
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function typeLabelKo(code: string): string {
  return typeLabels[code]?.ko ?? code;
}

function PreviewCard({
  item,
  index,
  preview,
  typeValue,
  tagLineValue,
  onTypeChange,
  onTagLineChange,
}: {
  item: QuickAddMediaJson;
  index: number;
  preview: MediaQuickAddCreate;
  typeValue: string;
  tagLineValue: string;
  onTypeChange: (v: string) => void;
  onTagLineChange: (v: string) => void;
}) {
  const thumb = item.extracted_images[0];
  return (
    <Card className="overflow-hidden">
      <div className="flex h-36 bg-slate-100">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex w-full items-center justify-center text-xs text-muted-foreground">
            이미지 없음
          </div>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          #{index + 1}
        </p>
        <p className="font-bold text-foreground">{item.media_name}</p>
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          {preview.location}
        </p>
        <div className="rounded-2xl border-2 border-border bg-muted px-3 py-2 text-xs bg-muted/60">
          <p className="font-semibold text-foreground">
            저장 유형:{" "}
            <span className="text-primary">{preview.type}</span>{" "}
            <span className="font-normal text-muted-foreground">
              ({typeLabelKo(preview.type)})
            </span>
          </p>
          <label className="mt-2 block text-[10px] font-medium text-muted-foreground">
            유형 덮어쓰기 (선택)
          </label>
          <select
            className="mt-1 w-full rounded-md border-2 border-border bg-card px-2 py-1.5 text-xs text-foreground"
            value={typeValue}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="">자동 ({typeLabelKo(preview.type)})</option>
            {CATALOG_MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} — {typeLabelKo(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">
            태그 (쉼표 구분 → 자동 태그와 합쳐짐)
          </label>
          <Input
            className="mt-1 h-9 text-xs"
            value={tagLineValue}
            onChange={(e) => onTagLineChange(e.target.value)}
            placeholder="강남, 역세권, 대형"
          />
          {preview.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {preview.tags.slice(0, 16).map((t) => (
                <span
                  key={t}
                  className="rounded-full border-2 border-border bg-card px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.12em] text-foreground"
                >
                  {t}
                </span>
              ))}
              {preview.tags.length > 16 ? (
                <span className="text-[10px] text-muted-foreground">
                  +{preview.tags.length - 16}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground">
          ₩{Math.round(item.price_per_month).toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground"> /월</span>
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.description || "—"}
        </p>
      </CardContent>
    </Card>
  );
}
