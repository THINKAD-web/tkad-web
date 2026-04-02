"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { adminFetchJson } from "@/lib/admin-client-fetch";

type Props = { mediaId: string };

export default function MediaJsonEditClient({ mediaId }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const save = async () => {
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
      const result = await adminFetchJson(
        `/api/admin/medias/${mediaId}/json`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        },
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const raw: unknown = result.data;
      const nextJson =
        typeof raw === "object" &&
        raw !== null &&
        "json" in raw &&
        typeof (raw as { json: unknown }).json === "object"
          ? (raw as { json: Record<string, unknown> }).json
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">JSON으로 매체 수정</h1>
          <p className="text-sm text-muted-foreground">
            ID: <code className="text-xs">{mediaId}</code> · quick-add와 동일 키
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-0 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-navy">JSON</CardTitle>
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
            <CardTitle className="text-base text-navy">미리보기</CardTitle>
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
                  <p className="font-semibold text-navy">{preview.name}</p>
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
                    <div className="overflow-hidden rounded-lg border border-navy/10 text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-navy/5">
                            <th className="px-2 py-1.5 text-left font-semibold text-navy/60">구분</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-navy/60">금액</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-navy/60">기간</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-navy/60">설명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.priceOptions.map((opt, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              <td className="px-2 py-1.5 font-semibold text-navy">{opt.label}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-gold-dark">₩{opt.price.toLocaleString("ko-KR")}</td>
                              <td className="px-2 py-1.5 text-right text-muted-foreground">{opt.period ?? "month"}</td>
                              <td className="max-w-[10rem] px-2 py-1.5 text-left text-[11px] text-muted-foreground">
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
                    <p className="font-semibold text-navy">
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
          className="bg-navy text-white"
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
