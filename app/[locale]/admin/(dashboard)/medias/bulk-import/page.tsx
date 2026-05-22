"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { adminFetchJson } from "@/lib/admin-client-fetch";
import {
  parseQuickAddJsonText,
  validateQuickAddItems,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";

type ParseState =
  | { kind: "empty" }
  | { kind: "syntax"; message: string }
  | { kind: "schema"; message: string }
  | { kind: "ok"; items: QuickAddMediaJson[] };

type ImportOutcome =
  | { kind: "created"; id: string; name: string }
  | { kind: "updated"; id: string; name: string }
  | { kind: "failed"; name: string; error: string };

type ImportResponse = {
  ok: true;
  matchKey: "name" | "id";
  dryRun: boolean;
  counts: { created: number; updated: number; failed: number };
  outcomes: ImportOutcome[];
};

const SAMPLE_BULK_JSON = `[
  {
    "media_name": "기존 매체 A (이름 일치 → 업데이트)",
    "description": "기존 매체에 daily_footfall / visibility_score / target_age 만 추가하고 싶어도 전체 JSON을 다시 보내야 합니다.",
    "sub_category": "정류장",
    "tags": ["서울", "강남"],
    "full_address": "서울 강남구 강남대로 396",
    "district": "강남구",
    "city": "서울",
    "latitude": 37.498,
    "longitude": 127.0276,
    "price_per_month": 3000000,
    "price_note": "VAT 별도",
    "operating_hours": "06:00 - 24:00",
    "daily_footfall": 165786,
    "weekday_footfall": 180000,
    "target_age": "20~40대",
    "visibility_score": 83,
    "effect_memo": "고유동·시인성 우수",
    "extracted_images": [],
    "nearby_facilities": "",
    "nearby_stations": "",
    "nearby_landmarks": "",
    "past_advertisers": ""
  }
]`;

export default function AdminMediasBulkImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [matchKey, setMatchKey] = useState<"name" | "id">("name");
  const [submitting, setSubmitting] = useState(false);
  const [dryRunBusy, setDryRunBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [response, setResponse] = useState<ImportResponse | null>(null);

  const parseState: ParseState = useMemo(() => {
    if (!text.trim()) return { kind: "empty" };
    const parsed = parseQuickAddJsonText(text);
    if (!parsed.ok) return { kind: "syntax", message: parsed.error };
    const validated = validateQuickAddItems(parsed.raw);
    if (!validated.ok) return { kind: "schema", message: validated.error };
    return { kind: "ok", items: validated.items };
  }, [text]);

  const rawItems = useMemo<unknown[]>(() => {
    if (!text.trim()) return [];
    const parsed = parseQuickAddJsonText(text);
    return parsed.ok ? parsed.raw : [];
  }, [text]);

  const loadSample = useCallback(() => {
    setText(SAMPLE_BULK_JSON);
    setSubmitError(null);
    setResponse(null);
  }, []);

  const performImport = async (dryRun: boolean) => {
    if (parseState.kind !== "ok") return;
    if (dryRun) setDryRunBusy(true);
    else setSubmitting(true);
    setSubmitError(null);
    if (!dryRun) setResponse(null);
    try {
      const result = await adminFetchJson("/api/admin/medias/bulk-import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rawItems,
          matchKey,
          dryRun,
        }),
      });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      setResponse(result.data as ImportResponse);
      if (!dryRun) {
        // 목록 페이지에 신규 데이터 반영
        router.refresh();
      }
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setDryRunBusy(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/medias"
            className="mb-2 inline-flex items-center gap-1 border-b-2 border-border pb-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-primary hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            매체 목록
          </Link>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ MEDIA BULK IMPORT ]
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            매체 일괄 가져오기 (JSON Upsert)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            JSON 배열을 붙여넣으면 매체명(<code className="rounded bg-slate-100 px-1">media_name</code>)
            기준으로 기존 매체는 <strong>업데이트</strong>, 없는 매체는 <strong>신규 등록</strong>됩니다.
            quick-add 와 동일한 카카오·주변·유동인구 보강이 적용됩니다.{" "}
            <strong>주의</strong>: 부분 갱신이 아니라 전체 JSON 으로 덮어쓰기입니다 — 누락된 필드는 빈 값/기본값으로 들어갑니다.
            먼저 <strong>시뮬레이션 (dry-run)</strong> 으로 어떤 항목이 생성/업데이트되는지 확인 후 실행하세요.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadSample}>
          샘플 JSON 넣기
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">매칭 옵션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="matchKey"
                value="name"
                checked={matchKey === "name"}
                onChange={() => setMatchKey("name")}
                className="h-4 w-4"
              />
              <span>
                <strong>media_name</strong> 으로 매칭 (권장)
              </span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="matchKey"
                value="id"
                checked={matchKey === "id"}
                onChange={() => setMatchKey("id")}
                className="h-4 w-4"
              />
              <span>
                <strong>id</strong> 로 매칭 (각 item 에{" "}
                <code className="rounded bg-slate-100 px-1">id</code> 필드 필수)
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            동일 이름 매체가 DB 에 있으면 그 row 가 업데이트됩니다. id 매칭은 더 안전하지만,
            기존 매체의 cuid 를 알아야 합니다 (매체 편집 페이지 URL 끝부분).
          </p>
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
            placeholder='[ { "media_name": "...", "full_address": "...", ... }, { ... } ]'
            className="min-h-[420px] font-mono text-sm"
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={parseState.kind !== "ok" || dryRunBusy || submitting}
              onClick={() => void performImport(true)}
            >
              {dryRunBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              시뮬레이션 (Dry-run)
            </Button>
            <Button
              type="button"
              className="border-2 border-border bg-primary font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:border-border"
              disabled={parseState.kind !== "ok" || submitting || dryRunBusy}
              onClick={() => {
                if (parseState.kind !== "ok") return;
                if (
                  !window.confirm(
                    `총 ${parseState.items.length}건을 import 합니다 (없는 건 신규, 있는 건 업데이트). 계속할까요?`,
                  )
                ) {
                  return;
                }
                void performImport(false);
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  실행 중…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  실행
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {response ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {response.dryRun ? "시뮬레이션 결과" : "실행 결과"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2 text-[11px] font-mono uppercase tracking-[0.16em]">
              <span className="border-2 border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-900">
                CREATED {response.counts.created}
              </span>
              <span className="border-2 border-blue-300 bg-blue-50 px-2 py-1 text-blue-900">
                UPDATED {response.counts.updated}
              </span>
              <span className="border-2 border-red-300 bg-red-50 px-2 py-1 text-red-900">
                FAILED {response.counts.failed}
              </span>
            </div>
            <ul className="space-y-1 text-xs">
              {response.outcomes.map((o, i) => (
                <li
                  key={i}
                  className={
                    o.kind === "failed"
                      ? "border-l-4 border-red-400 bg-red-50 px-2 py-1 text-red-900"
                      : o.kind === "updated"
                      ? "border-l-4 border-blue-400 bg-blue-50 px-2 py-1 text-blue-900"
                      : "border-l-4 border-emerald-400 bg-emerald-50 px-2 py-1 text-emerald-900"
                  }
                >
                  <span className="font-mono uppercase tracking-[0.14em]">
                    {o.kind}
                  </span>{" "}
                  · <strong>{o.name}</strong>
                  {o.kind !== "failed" ? (
                    <>
                      {" "}
                      · <code className="text-[10px]">{o.id}</code>
                    </>
                  ) : (
                    <>
                      {" "}
                      —{" "}
                      <span className="text-[11px] text-red-700">{o.error}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {response.dryRun ? (
              <p className="text-xs text-muted-foreground">
                시뮬레이션 결과입니다. DB 에는 변경이 가해지지 않았습니다. 실행 버튼으로 확정하세요.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                실행 완료. 매체 목록 / /media / /planner 페이지 캐시가 갱신되었습니다.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
