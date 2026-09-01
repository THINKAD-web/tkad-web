"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { adminFetchJson } from "@/lib/admin-client-fetch";
import { useToast } from "@/components/toast-provider";
import { COMPUTED_FIELDS_LOCKED, LOCKED_FIELD_SNAKE_ALIASES } from "@/lib/media/locked-fields";
import { MetricsWriteWarningsModal } from "@/components/admin/metrics-write-warnings-modal";
import {
  isMetricsWarningsPayload,
  type MediaMetricsFieldWarning,
} from "@/lib/media-metrics-write";
import { PartialPeriodRatesFields } from "@/components/admin/partial-period-rates-fields";
import {
  EMPTY_PARTIAL_PERIOD_RATES_DRAFT,
  partialPeriodRatesDraftFromMap,
  partialPeriodRatesMapFromDraft,
  parsePartialPeriodRatesRaw,
  type PartialPeriodRatesDraft,
} from "@/lib/media-partial-period-rates";

type Props = { mediaId: string };

export default function MediaJsonEditClient({ mediaId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [partialPeriodRates, setPartialPeriodRates] =
    useState<PartialPeriodRatesDraft>({ ...EMPTY_PARTIAL_PERIOD_RATES_DRAFT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsWarnings, setMetricsWarnings] = useState<
    MediaMetricsFieldWarning[] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await adminFetchJson(
        `/api/admin/medias/${mediaId}/json`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      if (!result.ok) {
        setLoadError(result.message);
        setText("");
        return;
      }
      const raw: unknown = result.data;
      const j =
        typeof raw === "object" &&
        raw !== null &&
        "json" in raw &&
        typeof (raw as { json: unknown }).json === "object"
          ? (raw as { json: Record<string, unknown> }).json
          : null;
      setText(j ? JSON.stringify(j, null, 2) : "{}");

      const detail = await adminFetchJson(`/api/admin/medias/${mediaId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (detail.ok) {
        const media =
          typeof detail.data === "object" &&
          detail.data !== null &&
          "media" in detail.data
            ? (detail.data as { media: { partialPeriodRates?: unknown } }).media
            : null;
        setPartialPeriodRates(
          partialPeriodRatesDraftFromMap(
            parsePartialPeriodRatesRaw(media?.partialPeriodRates),
          ),
        );
      }
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "불러오기 요청을 처리하지 못했습니다.",
      );
      setText("");
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(() => {
    const t = text.trim();
    if (!t) return { ok: false as const, error: "비어 있음" };
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      const name =
        (typeof o.media_name === "string" && o.media_name) ||
        (typeof o.name === "string" && o.name) ||
        "—";
      const addr =
        (typeof o.full_address === "string" && o.full_address) || "—";
      const price =
        typeof o.price_per_month === "number"
          ? o.price_per_month
          : typeof o.price === "number"
            ? o.price
            : null;
      const tags = Array.isArray(o.tags)
        ? o.tags.filter((x): x is string => typeof x === "string")
        : [];
      const rawOpts = o.price_options ?? o.priceOptions;
      const priceOptions = Array.isArray(rawOpts)
        ? (
            rawOpts as Array<{
              label: string;
              price: number;
              period?: string;
              description?: string;
            }>
          ).filter(
            (x) => typeof x.label === "string" && typeof x.price === "number",
          )
        : null;
      return { ok: true as const, name, addr, price, tags, priceOptions };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "JSON 오류",
      };
    }
  }, [text]);

  const save = async (acknowledgeMetricsWarnings = false) => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(
        `JSON 문법 오류: ${e instanceof Error ? e.message : "parse failed"}`,
      );
      return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError("최상위는 객체여야 합니다.");
      return;
    }

    setSaving(true);
    try {
      const ratesMap = partialPeriodRatesMapFromDraft(partialPeriodRates);
      const ratesResult = await adminFetchJson(`/api/admin/medias/${mediaId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partialPeriodRates: ratesMap ?? null,
        }),
      });
      if (!ratesResult.ok) {
        setError(ratesResult.message);
        return;
      }

      const jsonRes = await fetch(`/api/admin/medias/${mediaId}/json`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(parsed as Record<string, unknown>),
          ...(acknowledgeMetricsWarnings
            ? { acknowledgeMetricsWarnings: true }
            : {}),
        }),
      });
      const jsonRaw = await jsonRes.text();
      let jsonData: unknown = {};
      if (jsonRaw.trim()) {
        try {
          jsonData = JSON.parse(jsonRaw);
        } catch {
          setError("서버 응답을 읽을 수 없습니다.");
          return;
        }
      }
      if (!jsonRes.ok) {
        if (jsonRes.status === 409 && isMetricsWarningsPayload(jsonData)) {
          setMetricsWarnings(jsonData.warnings);
          return;
        }
        const msg =
          typeof jsonData === "object" &&
          jsonData !== null &&
          "error" in jsonData &&
          typeof (jsonData as { error: unknown }).error === "string"
            ? (jsonData as { error: string }).error
            : `저장 실패 (HTTP ${jsonRes.status})`;
        setError(msg);
        return;
      }
      setMetricsWarnings(null);

      const strippedHeader = jsonRes.headers.get("X-Locked-Fields-Stripped");
      if (strippedHeader) {
        toast(
          "warning",
          `다음 필드는 자동 계산되어 저장되지 않았습니다: ${strippedHeader}`,
        );
      }

      const nextJson =
        typeof jsonData === "object" &&
        jsonData !== null &&
        "json" in jsonData &&
        typeof (jsonData as { json: unknown }).json === "object"
          ? (jsonData as { json: Record<string, unknown> }).json
          : null;
      if (nextJson) {
        setText(JSON.stringify(nextJson, null, 2));
      }
      router.push("/admin/medias");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "저장 요청을 처리하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>불러오는 중…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{loadError}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/medias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {metricsWarnings && metricsWarnings.length > 0 ? (
        <MetricsWriteWarningsModal
          warnings={metricsWarnings}
          busy={saving}
          onCancel={() => setMetricsWarnings(null)}
          onConfirm={() => void save(true)}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tkad-type-label text-muted-foreground">
            [ MEDIA JSON EDIT ]
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            JSON으로 매체 수정
          </h1>
          <p className="text-sm text-muted-foreground">
            ID: <code className="text-xs">{mediaId}</code> · quick-add와 동일 키
            · 부분기간 요율은 아래 패널에서 편집 (매체 목록 폼과 동기화)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            🔒 Computed 필드(
            {[
              ...COMPUTED_FIELDS_LOCKED,
              ...Object.keys(LOCKED_FIELD_SNAKE_ALIASES),
            ].join(", ")}
            )는 참조용으로 표시되며 저장 시 무시됩니다.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/medias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card className="border-border/80 bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">
            부분기간 요율
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PartialPeriodRatesFields
            draft={partialPeriodRates}
            onChange={setPartialPeriodRates}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-0 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="min-h-[min(70vh,520px)] font-mono text-xs leading-relaxed"
              placeholder="{ ... }"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">미리보기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!preview.ok ? (
              <p className="text-amber-800">{preview.error}</p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    매체명
                  </p>
                  <p className="font-semibold text-foreground">{preview.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    주소
                  </p>
                  <p className="text-muted-foreground">{preview.addr}</p>
                </div>
                {preview.priceOptions && preview.priceOptions.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">가격 옵션</p>
                    <div className="overflow-hidden rounded-2xl border-2 border-border text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted bg-muted/60">
                            <th className="px-2 py-1.5 text-left font-semibold text-foreground">구분</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-foreground">금액</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-foreground">기간</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-foreground">설명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.priceOptions.map((opt, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted bg-muted/60"}>
                              <td className="px-2 py-1.5 font-semibold text-foreground">{opt.label}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-primary">₩{opt.price.toLocaleString("ko-KR")}</td>
                              <td className="px-2 py-1.5 text-right text-muted-foreground">{opt.period ?? "month"}</td>
                              <td className="max-w-[10rem] px-2 py-1.5 text-left tkad-type-caption text-muted-foreground">
                                {opt.description?.trim() ? opt.description : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : preview.price != null ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      월 가격(원)
                    </p>
                    <p className="font-semibold text-foreground">
                      ₩{preview.price.toLocaleString("ko-KR")}
                    </p>
                  </div>
                ) : null}
                {preview.tags.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      태그
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {preview.tags.slice(0, 12).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      {preview.tags.length > 12 ? (
                        <span className="text-xs text-muted-foreground">
                          +{preview.tags.length - 12}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          저장
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/medias">취소</Link>
        </Button>
      </div>
    </div>
  );
}
