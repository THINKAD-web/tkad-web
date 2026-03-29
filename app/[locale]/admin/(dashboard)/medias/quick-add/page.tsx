"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, AlertCircle } from "lucide-react";
import {
  parseQuickAddJsonText,
  validateQuickAddItems,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";

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
  "daily_footfall": 280000,
  "weekday_footfall": 220000,
  "target_age": "20–40대",
  "impressions": 1200000,
  "reach": 45.2,
  "frequency": 3.1,
  "cpm": 8500,
  "engagement_rate": 1.2,
  "visibility_score": 88,
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

  const parseState: ParseState = useMemo(() => {
    if (!debouncedText.trim()) return { kind: "empty" };
    const parsed = parseQuickAddJsonText(debouncedText);
    if (!parsed.ok) return { kind: "syntax", message: parsed.error };
    const validated = validateQuickAddItems(parsed.raw);
    if (!validated.ok) return { kind: "schema", message: validated.error };
    return { kind: "ok", items: validated.items };
  }, [debouncedText]);

  const loadSample = useCallback(() => {
    setText(SAMPLE_JSON);
    setSubmitError(null);
  }, []);

  const onSubmit = async () => {
    if (parseState.kind !== "ok") return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/admin/medias/quick-add", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parseState.items }),
      });
      const data = (await res.json()) as {
        error?: string;
        count?: number;
      };
      if (!res.ok) {
        setSubmitError(data.error ?? "등록 실패");
        return;
      }
      // 목록 페이지가 bfcache·클라이언트 상태로 옛 데이터를 보이지 않도록 쿼리로 재조회 유도
      router.push(`/admin/medias?updated=${Date.now()}`);
      router.refresh();
    } catch {
      setSubmitError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/medias"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" />
            매체 목록
          </Link>
          <h2 className="text-xl font-bold text-navy">매체 간편 등록 (JSON)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            객체 하나 또는 배열을 붙여넣으면 실시간으로 검증·미리보기됩니다. 등록 시 DB에
            저장되며 매체 관리·미디어 허브에서 동일하게 조회됩니다.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadSample}>
          샘플 JSON 넣기
        </Button>
      </div>

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
            className="min-h-[420px] font-mono text-sm"
            spellCheck={false}
          />
          {parseState.kind === "syntax" && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseState.message}
            </div>
          )}
          {parseState.kind === "schema" && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseState.message}
            </div>
          )}
          {parseState.kind === "ok" && (
            <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              파싱 성공 · {parseState.items.length}건
            </div>
          )}
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
          <Button
            type="button"
            className="bg-gold font-semibold text-navy hover:bg-gold-dark"
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
          <h3 className="mb-3 text-sm font-semibold text-navy">미리보기</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {parseState.items.map((item, idx) => (
              <PreviewCard key={`${item.media_name}-${idx}`} item={item} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewCard({ item, index }: { item: QuickAddMediaJson; index: number }) {
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
      <CardContent className="space-y-2 p-4">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          #{index + 1}
        </p>
        <p className="font-bold text-navy">{item.media_name}</p>
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          {item.full_address || `${item.city} ${item.district}`.trim()}
        </p>
        <p className="text-sm font-semibold text-navy">
          ₩{Math.round(item.price_per_month).toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground"> /월</span>
        </p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 8).map((t) => (
              <span
                key={t}
                className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] text-navy"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.description || "—"}
        </p>
      </CardContent>
    </Card>
  );
}
