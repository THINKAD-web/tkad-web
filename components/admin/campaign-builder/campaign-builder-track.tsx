"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
  type CampaignBuilderReportListItem,
} from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import { buildAdminReportsHubPath, type AdminReportHubStep } from "@/lib/admin-reports-hub";
import { CampaignBuilderReportPreview } from "@/components/admin/campaign-builder/campaign-builder-report-preview";
import { CampaignBuilderDigitalPanel } from "@/components/admin/campaign-builder/campaign-builder-digital-panel";
import { campaignBuilderExportCopy } from "@/lib/admin-campaign-builder/copy-ko";
import { campaignBuilderExportHref } from "@/lib/admin-campaign-builder/export-url";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import { Download } from "lucide-react";
import { CampaignBuilderOohPanel } from "@/components/admin/campaign-builder/campaign-builder-ooh-panel";
import { CampaignBuilderCustomLinesPanel } from "@/components/admin/campaign-builder/campaign-builder-custom-lines-panel";
import { CampaignBuilderInsightsPanel } from "@/components/admin/campaign-builder/campaign-builder-insights-panel";
import { CampaignBuilderComparePanel } from "@/components/admin/campaign-builder/campaign-builder-compare-panel";
import { Button } from "@/components/ui/button";

export type CampaignBuilderCatalogProps = {
  digitalViews: PublicMediaView[];
  oohItems: MediaCatalogListItem[];
};

function emptyPayload(): CampaignBuilderPayload {
  return {
    version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
    mode: "digital",
    documentType: "proposal",
    title: "",
    digitalLines: [],
    oohLines: [],
    customLines: [],
  };
}

type Props = CampaignBuilderCatalogProps & {
  isKo: boolean;
  locale: string;
  step: AdminReportHubStep;
  style: PlannerReportStyle;
  onReadyForPreview: () => void;
};

export function CampaignBuilderTrack({
  isKo,
  locale,
  digitalViews,
  oohItems,
  step,
  style,
  onReadyForPreview,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id")?.trim() || null;

  const [reportId, setReportId] = useState<string | null>(null);
  const [payload, setPayload] = useState<CampaignBuilderPayload>(emptyPayload);
  const [reports, setReports] = useState<CampaignBuilderReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/admin/campaign-builder/reports", {
      credentials: "include",
    });
    const data = (await res.json()) as {
      reports?: CampaignBuilderReportListItem[];
      error?: string;
    };
    if (res.ok && data.reports) {
      setReports(data.reports);
    }
  }, []);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaign-builder/reports/${id}`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        payload?: CampaignBuilderPayload;
        error?: string;
      };
      if (!res.ok || !data.payload) {
        throw new Error(data.error ?? "Not found");
      }
      setPayload(data.payload);
      setReportId(id);
      const currentStep = searchParams.get("step");
      const step =
        currentStep === "1" || currentStep === "2" || currentStep === "3"
          ? currentStep
          : 2;
      const href = buildAdminReportsHubPath({
        type: "builder",
        step,
      });
      const q = new URLSearchParams(href.split("?")[1] ?? "");
      q.set("id", id);
      router.replace(`/${locale}/admin/reports?${q.toString()}`, {
        scroll: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [locale, router, searchParams]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!idFromUrl) return;
    void loadReport(idFromUrl);
  }, [idFromUrl, loadReport]);

  async function saveReport() {
    if (!payload.title.trim()) {
      setError(isKo ? "제목을 입력하세요." : "Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = reportId
        ? `/api/admin/campaign-builder/reports/${reportId}`
        : "/api/admin/campaign-builder/reports";
      const res = await fetch(url, {
        method: reportId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        id?: string;
        error?: string;
        details?: unknown;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      const nextId = data.id ?? reportId;
      if (nextId && !reportId) {
        setReportId(nextId);
        const href = buildAdminReportsHubPath({ type: "builder", step: 2 });
        const q = new URLSearchParams(href.split("?")[1] ?? "");
        q.set("id", nextId);
        router.replace(`/${locale}/admin/reports?${q.toString()}`, {
          scroll: false,
        });
      }
      setMessage(isKo ? "저장되었습니다." : "Saved.");
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function newReport() {
    setReportId(null);
    setPayload(emptyPayload());
    setMessage("");
    setError("");
    router.replace(`/${locale}${buildAdminReportsHubPath({ type: "builder", step: 2 })}`, {
      scroll: false,
    });
  }

  return (
    <div
      className="grid gap-6 lg:grid-cols-[240px_1fr]"
      data-testid="campaign-builder-track"
    >
      <aside className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {isKo ? "내 리포트" : "My reports"}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={newReport}>
            {isKo ? "새로" : "New"}
          </Button>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
          {reports.length === 0 ? (
            <li className="px-2 py-3 text-muted-foreground">
              {isKo ? "저장된 리포트 없음" : "No saved reports"}
            </li>
          ) : (
            reports.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => void loadReport(r.id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted/50 ${
                    reportId === r.id ? "bg-[color:var(--qp-accent)]/15 font-medium" : ""
                  }`}
                >
                  <span className="block truncate">{r.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.mode} · {r.documentType}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap gap-2">
            {(["digital", "ooh"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPayload((p) => ({ ...p, mode }))}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  payload.mode === mode
                    ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]/15"
                    : "border-border"
                }`}
              >
                {mode === "digital"
                  ? isKo
                    ? "디지털"
                    : "Digital"
                  : isKo
                    ? "OOH"
                    : "OOH"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(["proposal", "report"] as const).map((doc) => (
              <button
                key={doc}
                type="button"
                onClick={() => setPayload((p) => ({ ...p, documentType: doc }))}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  payload.documentType === doc
                    ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]/15"
                    : "border-border"
                }`}
              >
                {doc === "proposal"
                  ? isKo
                    ? "제안서"
                    : "Proposal"
                  : isKo
                    ? "리포트"
                    : "Report"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              {isKo ? "제목" : "Title"} *
              <input
                value={payload.title}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, title: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              {isKo ? "고객사" : "Client company"}
              <input
                value={payload.clientCompany ?? ""}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, clientCompany: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              {isKo ? "담당자" : "Contact name"}
              <input
                value={payload.clientName ?? ""}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, clientName: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              {isKo ? "메모" : "Notes"}
              <textarea
                rows={2}
                value={payload.notes ?? ""}
                onChange={(e) =>
                  setPayload((p) => ({ ...p, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void saveReport()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isKo ? "저장 중…" : "Saving…"}
                </>
              ) : reportId ? (
                isKo ? "저장 (PATCH)" : "Save"
              ) : (
                isKo ? "저장 (POST)" : "Create"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!payload.title.trim()}
              onClick={onReadyForPreview}
              data-testid="campaign-builder-go-preview"
            >
              {campaignBuilderExportCopy.goToPreview}
            </Button>
            {reportId ? (
              <span className="text-xs text-muted-foreground">id: {reportId}</span>
            ) : null}
            {message ? (
              <span className="text-sm text-[color:var(--qp-accent)]">{message}</span>
            ) : null}
            {error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : null}
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            {isKo ? "불러오는 중…" : "Loading report…"}
          </p>
        ) : null}

        {payload.mode === "digital" ? (
          <CampaignBuilderDigitalPanel
            isKo={isKo}
            payload={payload}
            views={digitalViews}
            onChange={setPayload}
          />
        ) : (
          <CampaignBuilderOohPanel
            isKo={isKo}
            payload={payload}
            items={oohItems}
            onChange={setPayload}
          />
        )}

        <CampaignBuilderCustomLinesPanel
          isKo={isKo}
          payload={payload}
          onChange={setPayload}
        />

        <CampaignBuilderInsightsPanel
          isKo={isKo}
          payload={payload}
          digitalViews={digitalViews}
          onChange={setPayload}
        />

        <CampaignBuilderComparePanel
          isKo={isKo}
          reports={reports}
          digitalViews={digitalViews}
        />

        {step >= 3 ? (
          <section
            className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4"
            data-testid="campaign-builder-preview-step"
          >
            <p className="font-bold">{campaignBuilderExportCopy.previewTitle}</p>
            <CampaignBuilderReportPreview
              reportTitle={payload.title.trim() || (isKo ? "제목 없음" : "Untitled")}
              payload={payload}
              catalog={{ digital: digitalViews, ooh: oohItems }}
              style={style}
            />
            <div className="flex flex-wrap items-center gap-2">
              {reportId ? (
                <>
                  <Button type="button" asChild>
                    <a
                      href={campaignBuilderExportHref(reportId, "pdf", style)}
                      download
                      data-testid="campaign-builder-export-pdf"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {campaignBuilderExportCopy.pdfDownload}
                    </a>
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <a
                      href={campaignBuilderExportHref(reportId, "pptx", style)}
                      download
                      data-testid="campaign-builder-export-pptx"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {campaignBuilderExportCopy.pptxDownload}
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" disabled data-testid="campaign-builder-export-pdf">
                    <Download className="mr-2 h-4 w-4" />
                    {campaignBuilderExportCopy.pdfDownload}
                  </Button>
                  <Button type="button" variant="outline" disabled data-testid="campaign-builder-export-pptx">
                    <Download className="mr-2 h-4 w-4" />
                    {campaignBuilderExportCopy.pptxDownload}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {campaignBuilderExportCopy.saveBeforeExport}
                  </p>
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
