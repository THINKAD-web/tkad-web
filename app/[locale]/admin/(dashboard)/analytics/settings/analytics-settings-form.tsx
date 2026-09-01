"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import type {
  AnalyticsIntegrationState,
  AnalyticsProviderKey,
  AnalyticsSettingsResponse,
} from "@/lib/analytics-integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProviderStateMap = Record<AnalyticsProviderKey, AnalyticsIntegrationState>;

const EMPTY_STATE: ProviderStateMap = {
  ga4: {
    provider: "ga4",
    enabled: false,
    measurementId: "",
    containerId: "",
    notes: "",
    updatedAt: null,
  },
  gtm: {
    provider: "gtm",
    enabled: false,
    measurementId: "",
    containerId: "",
    notes: "",
    updatedAt: null,
  },
};

function formatUpdatedAt(value: string | null, locale: string): string {
  if (!value) return locale === "ko" ? "저장 이력 없음" : "No saved changes yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
}

export function AnalyticsSettingsForm({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [configured, setConfigured] = useState(true);
  const [form, setForm] = useState<ProviderStateMap>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/analytics/integrations", {
          cache: "no-store",
        });
        const data = (await response.json()) as AnalyticsSettingsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.error ??
              (isKo
                ? "분석 설정을 불러오지 못했습니다."
                : "Failed to load analytics settings."),
          );
        }

        if (cancelled) return;
        setConfigured(data.configured);
        setForm(data.integrations);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : isKo
              ? "분석 설정을 불러오지 못했습니다."
              : "Failed to load analytics settings.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isKo]);

  const dualTrackingEnabled = useMemo(
    () => form.ga4.enabled && form.gtm.enabled,
    [form.ga4.enabled, form.gtm.enabled],
  );

  const updateProvider = (
    provider: AnalyticsProviderKey,
    patch: Partial<AnalyticsIntegrationState>,
  ) => {
    setForm((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        ...patch,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/analytics/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ga4: {
            enabled: form.ga4.enabled,
            measurementId: form.ga4.measurementId,
            notes: form.ga4.notes,
          },
          gtm: {
            enabled: form.gtm.enabled,
            containerId: form.gtm.containerId,
            notes: form.gtm.notes,
          },
        }),
      });

      const data = (await response.json()) as
        | AnalyticsSettingsResponse
        | {
            error?: string;
            issues?: { message?: string }[];
          };

      if (!response.ok) {
        const issues =
          "issues" in data && Array.isArray(data.issues)
            ? data.issues.map((issue) => issue.message).filter(Boolean)
            : [];
        throw new Error(
          issues[0] ||
            ("error" in data && data.error) ||
            (isKo
              ? "분석 설정을 저장하지 못했습니다."
              : "Failed to save analytics settings."),
        );
      }

      if ("integrations" in data) {
        setConfigured(data.configured);
        setForm(data.integrations);
      }

      setNotice(
        isKo
          ? "GA4/GTM 설정이 저장되었습니다."
          : "GA4/GTM settings have been saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isKo
            ? "분석 설정을 저장하지 못했습니다."
            : "Failed to save analytics settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {configured
                ? isKo
                  ? "DB 저장 사용 중"
                  : "Database-backed"
                : isKo
                  ? "저장소 미준비"
                  : "Storage unavailable"}
            </Badge>
            {dualTrackingEnabled ? (
              <Badge variant="outline">
                {isKo ? "이중 추적 주의" : "Double-tracking caution"}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isKo ? "방문자 분석 도구 등록" : "Visitor Analytics Registration"}
          </CardTitle>
          <CardDescription>
            {isKo
              ? "GA4 측정 ID와 GTM 컨테이너 ID를 저장하고, 공개 사이트에서 사용할지 토글합니다."
              : "Store GA4 measurement IDs and GTM container IDs, then toggle whether they are used on the public site."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {!configured ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {isKo
                  ? "현재 서버에서 분석 설정 저장소를 사용할 수 없습니다. DB 연결과 마이그레이션 적용 상태를 확인한 뒤 다시 시도해 주세요."
                  : "Analytics settings storage is unavailable on this server. Check database connectivity and applied migrations, then try again."}
              </p>
            </div>
          ) : null}
          {dualTrackingEnabled ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                {isKo
                  ? "GA4 와 GTM 을 동시에 활성화하면 페이지뷰가 중복 수집될 수 있습니다. GTM 안에서 GA4 태그를 이미 운영 중이라면 둘 중 하나만 활성화하세요."
                  : "Enabling GA4 and GTM together can double-count pageviews. If GA4 is already managed inside GTM, enable only one path."}
              </p>
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{notice}</p>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>GA4</CardTitle>
                <CardDescription>
                  {isKo
                    ? "공개 사이트에서 직접 `gtag.js` 를 로드합니다."
                    : "Loads `gtag.js` directly on public pages."}
                </CardDescription>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.ga4.enabled}
                  onChange={(event) =>
                    updateProvider("ga4", { enabled: event.target.checked })
                  }
                  disabled={!configured || loading || saving}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                {isKo ? "활성화" : "Enabled"}
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isKo ? "GA4 측정 ID" : "GA4 measurement ID"}
              </label>
              <Input
                value={form.ga4.measurementId}
                onChange={(event) =>
                  updateProvider("ga4", { measurementId: event.target.value })
                }
                placeholder="G-ABC123XYZ"
                disabled={!configured || loading || saving}
              />
              <p className="text-xs text-muted-foreground">
                {isKo
                  ? "형식 예시: `G-ABC123XYZ`"
                  : "Expected format: `G-ABC123XYZ`"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isKo ? "운영 메모" : "Admin notes"}
              </label>
              <Textarea
                value={form.ga4.notes}
                onChange={(event) =>
                  updateProvider("ga4", { notes: event.target.value })
                }
                placeholder={
                  isKo
                    ? "예: 메인 웹사이트 전용 측정 ID"
                    : "Example: primary website measurement ID"
                }
                disabled={!configured || loading || saving}
              />
            </div>
            <p className="tkad-type-label text-muted-foreground">
              {`// `}
              {isKo ? "마지막 저장" : "Last saved"}:{" "}
              {formatUpdatedAt(form.ga4.updatedAt, locale)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Google Tag Manager</CardTitle>
                <CardDescription>
                  {isKo
                    ? "공개 사이트에서 GTM 스크립트를 로드합니다."
                    : "Loads the GTM container on public pages."}
                </CardDescription>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.gtm.enabled}
                  onChange={(event) =>
                    updateProvider("gtm", { enabled: event.target.checked })
                  }
                  disabled={!configured || loading || saving}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                {isKo ? "활성화" : "Enabled"}
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isKo ? "GTM 컨테이너 ID" : "GTM container ID"}
              </label>
              <Input
                value={form.gtm.containerId}
                onChange={(event) =>
                  updateProvider("gtm", { containerId: event.target.value })
                }
                placeholder="GTM-ABC1234"
                disabled={!configured || loading || saving}
              />
              <p className="text-xs text-muted-foreground">
                {isKo
                  ? "형식 예시: `GTM-ABC1234`"
                  : "Expected format: `GTM-ABC1234`"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isKo ? "운영 메모" : "Admin notes"}
              </label>
              <Textarea
                value={form.gtm.notes}
                onChange={(event) =>
                  updateProvider("gtm", { notes: event.target.value })
                }
                placeholder={
                  isKo
                    ? "예: 마케팅팀이 관리하는 메인 컨테이너"
                    : "Example: main container managed by marketing"
                }
                disabled={!configured || loading || saving}
              />
            </div>
            <p className="tkad-type-label text-muted-foreground">
              {`// `}
              {isKo ? "마지막 저장" : "Last saved"}:{" "}
              {formatUpdatedAt(form.gtm.updatedAt, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!configured || loading || saving}>
          {loading || saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loading
            ? isKo
              ? "불러오는 중..."
              : "Loading..."
            : saving
              ? isKo
                ? "저장 중..."
                : "Saving..."
              : isKo
                ? "설정 저장"
                : "Save settings"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {isKo
            ? "저장 후 공개 사이트에서 활성화된 도구만 로드됩니다."
            : "Only enabled integrations will be loaded on the public site after saving."}
        </p>
      </div>
    </div>
  );
}
