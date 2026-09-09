"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportStylePicker } from "@/components/planner/report-style-picker";
import AdminReportNewClient from "@/app/[locale]/admin/(dashboard)/reports/new/admin-report-new-client";
import { STATUS_LABEL } from "@/app/[locale]/admin/(dashboard)/campaigns/constants";
import {
  assembleCampaignReportPreviewData,
  campaignCompletionReportHref,
  campaignNotesAsProposalPaste,
  postGenerateCampaignCompletionReport,
} from "@/lib/admin-campaign-completion-client";
import {
  selectedCampaignReportIdentity,
  type CampaignReportIdentitySource,
} from "@/lib/admin-campaign-report-identity";
import {
  ADMIN_REPORT_HUB_TYPE_COPY,
  ADMIN_REPORT_HUB_TYPES,
  ADMIN_TREND_REPORT_PATH,
  buildAdminCampaignsReportPath,
  buildAdminReportsHubPath,
  parseAdminReportHubStep,
  parseAdminReportHubType,
  type AdminReportHubStep,
  type AdminReportHubType,
} from "@/lib/admin-reports-hub";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "@/lib/inquiry-auto-proposal/pilot-skus";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { isPlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { usePlannerReportStyle } from "@/hooks/use-planner-report-style";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import dynamic from "next/dynamic";

const CampaignReportPreview = dynamic(
  () => import("@/components/campaign-report-preview"),
  { ssr: false },
);

type CampaignRow = CampaignReportIdentitySource & {
  status: keyof typeof STATUS_LABEL;
};

type DryRunSummary = {
  mixUnits: Record<string, number>;
  snapshot: { totalCostWon: number; mixCpmWon: number | null } | null;
  thumbs: { name: string; thumbUrl: string | null }[];
  payload: PlannerReportExportPayload | null;
  msg: string;
};

export default function AdminReportsHubClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "ko";
  const isKo = locale === "ko";

  const typeFromUrl = parseAdminReportHubType(searchParams.get("type"));
  const stepFromUrl = parseAdminReportHubStep(searchParams.get("step"));
  const campaignFromUrl = searchParams.get("campaignId")?.trim() || null;

  const [type, setType] = useState<AdminReportHubType | null>(typeFromUrl);
  const [step, setStep] = useState<AdminReportHubStep>(
    typeFromUrl ? stepFromUrl : 1,
  );
  const [style, setStyle] = usePlannerReportStyle();
  const [includeOnline, setIncludeOnline] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);

  const pushQuery = useCallback(
    (next: {
      type?: AdminReportHubType | null;
      step?: AdminReportHubStep;
      campaignId?: string | null;
    }) => {
      const href = buildAdminReportsHubPath({
        type: next.type === undefined ? type : next.type,
        step: next.step ?? step,
        campaignId:
          next.campaignId === undefined ? campaignFromUrl : next.campaignId,
      });
      router.replace(`/${locale}${href}`, { scroll: false });
    },
    [campaignFromUrl, locale, router, step, type],
  );

  function goStep(nextStep: AdminReportHubStep) {
    if (nextStep > 1 && !type) return;
    setStep(nextStep);
    pushQuery({ step: nextStep });
  }

  function pickType(next: AdminReportHubType) {
    setType(next);
    setStep(2);
    pushQuery({ type: next, step: 2 });
  }

  return (
    <div className="space-y-6 p-6 text-foreground" data-testid="admin-reports-hub">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-accent)]/80">
            [ REPORTS HUB ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {isKo ? "보고서 허브" : "Reports hub"}
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isKo
              ? "// 제안서 · 성과보고서 · 트렌드 — 기존 API를 그대로 호출합니다."
              : "// Proposal · performance · trend — existing APIs only."}
          </p>
        </div>
        <ol className="flex gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
          {([1, 2, 3] as const).map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => goStep(n)}
                className={`rounded-full border px-3 py-1 ${
                  step === n
                    ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]/15"
                    : "border-border text-muted-foreground"
                }`}
              >
                {n}.{" "}
                {n === 1
                  ? isKo
                    ? "유형"
                    : "Type"
                  : n === 2
                    ? isKo
                      ? "입력"
                      : "Input"
                    : isKo
                      ? "미리보기"
                      : "Preview"}
              </button>
            </li>
          ))}
        </ol>
      </header>

      {step === 1 ? (
        <section className="grid gap-3 md:grid-cols-3">
          {ADMIN_REPORT_HUB_TYPES.map((id) => {
            const copy = ADMIN_REPORT_HUB_TYPE_COPY[id];
            const selected = type === id;
            const Icon =
              id === "proposal" ? FileText : id === "campaign" ? Megaphone : Sparkles;
            return (
              <button
                key={id}
                type="button"
                data-testid={`hub-type-${id}`}
                onClick={() => pickType(id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]/10"
                    : "border-border/60 bg-card/40 hover:border-[color:var(--qp-accent)]/40"
                }`}
              >
                <Icon className="mb-3 h-5 w-5 text-[color:var(--qp-accent)]" />
                <p className="font-bold">{isKo ? copy.ko : copy.en}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isKo ? copy.descKo : copy.descEn}
                </p>
              </button>
            );
          })}
        </section>
      ) : null}

      {step >= 2 && type ? (
        <CommonOptions
          isKo={isKo}
          type={type}
          style={style}
          onStyle={setStyle}
          includeOnline={includeOnline}
          onOnline={setIncludeOnline}
          includeImages={includeImages}
          onImages={setIncludeImages}
        />
      ) : null}

      {step >= 2 && type === "proposal" ? (
        <ProposalTrack
          isKo={isKo}
          locale={locale}
          step={step}
          style={style}
          includeImages={includeImages}
          includeOnline={includeOnline}
          initialCampaignId={campaignFromUrl}
          onReadyForPreview={() => goStep(3)}
        />
      ) : null}

      {step >= 2 && type === "campaign" ? (
        <CampaignTrack
          isKo={isKo}
          locale={locale}
          step={step}
          style={style}
          includeImages={includeImages}
          initialCampaignId={campaignFromUrl}
          onReadyForPreview={() => goStep(3)}
        />
      ) : null}

      {step >= 2 && type === "trend" ? (
        <div className="-mx-6 -mb-6">
          <p className="mb-2 px-6 text-[11px] text-muted-foreground">
            {isKo
              ? "아래는 기존 /admin/reports/new 와 동일한 트렌드 작성기입니다."
              : "Same trend wizard as /admin/reports/new."}{" "}
            <Link
              href={`/${locale}${ADMIN_TREND_REPORT_PATH}`}
              className="underline-offset-2 hover:underline"
            >
              {isKo ? "단독 페이지로 열기" : "Open standalone"}
            </Link>
          </p>
          <AdminReportNewClient compact />
        </div>
      ) : null}
    </div>
  );
}

function CommonOptions({
  isKo,
  type,
  style,
  onStyle,
  includeOnline,
  onOnline,
  includeImages,
  onImages,
}: {
  isKo: boolean;
  type: AdminReportHubType;
  style: Parameters<typeof ReportStylePicker>[0]["value"];
  onStyle: (v: Parameters<typeof ReportStylePicker>[0]["value"]) => void;
  includeOnline: boolean;
  onOnline: (v: boolean) => void;
  includeImages: boolean;
  onImages: (v: boolean) => void;
}) {
  const styleApplies = type === "proposal" || type === "campaign";
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <p className="mb-3 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {isKo ? "공통 옵션" : "Shared options"}
      </p>
      {styleApplies ? (
        <ReportStylePicker isKo={isKo} value={style} onChange={onStyle} />
      ) : (
        <p className="text-xs text-muted-foreground">
          {isKo
            ? "스타일(minimal/brand/corporate)은 매체 제안서·성과보고서에 적용됩니다."
            : "Style applies to media proposal and campaign performance reports."}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeOnline}
            onChange={(e) => onOnline(e.target.checked)}
          />
          {isKo ? "온라인 포함" : "Include online"}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => onImages(e.target.checked)}
          />
          {isKo ? "이미지 포함" : "Include images"}
        </label>
      </div>
      {type === "proposal" && !includeOnline ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {isKo
            ? "문의 자동 매칭은 OOH 믹스입니다. 디지털은 상세 플래너에서 이어서 작업하세요."
            : "Inquiry match is OOH-only. Continue digital in Detailed planner."}
        </p>
      ) : null}
    </section>
  );
}

function ProposalTrack({
  isKo,
  locale,
  step,
  style,
  includeImages,
  includeOnline,
  initialCampaignId,
  onReadyForPreview,
}: {
  isKo: boolean;
  locale: string;
  step: AdminReportHubStep;
  style: Parameters<typeof ReportStylePicker>[0]["value"];
  includeImages: boolean;
  includeOnline: boolean;
  initialCampaignId: string | null;
  onReadyForPreview: () => void;
}) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? "");
  const [text, setText] = useState(PILOT_DEFAULT_INQUIRY_TEXT);
  const [busy, setBusy] = useState<"dry" | "pdf" | "pptx" | "send" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<DryRunSummary | null>(null);
  const [to, setTo] = useState("");
  void includeOnline;

  useEffect(() => {
    void fetch("/api/admin/campaigns")
      .then((r) => r.json())
      .then((j: { campaigns?: CampaignRow[] }) => setCampaigns(j.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  function applyCampaign(id: string) {
    setCampaignId(id);
    const row = campaigns.find((c) => c.id === id);
    if (row) setText(campaignNotesAsProposalPaste(row));
  }

  async function runDry() {
    setBusy("dry");
    setErr(null);
    try {
      const res = await fetch("/api/admin/inquiry-auto-proposal/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        error?: string;
        mixUnits?: Record<string, number>;
        snapshot?: DryRunSummary["snapshot"];
        thumbs?: DryRunSummary["thumbs"];
        payload?: unknown;
        designatedCount?: number;
      };
      if (!res.ok) throw new Error(data.error ?? `http_${res.status}`);
      const payload = isPlannerReportExportPayload(data.payload)
        ? data.payload
        : null;
      setResult({
        mixUnits: data.mixUnits ?? {},
        snapshot: data.snapshot ?? null,
        thumbs: data.thumbs ?? [],
        payload,
        msg: `지정 ${data.designatedCount ?? "—"} · 본문 ${Object.keys(data.mixUnits ?? {}).length}`,
      });
      onReadyForPreview();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "dry_run_failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportFile(format: "pdf" | "pptx") {
    if (!result?.payload) {
      setErr(isKo ? "먼저 매칭을 실행하세요." : "Run match first.");
      return;
    }
    setBusy(format);
    setErr(null);
    try {
      await downloadPlannerReport(format, result.payload, {
        activitySource: "planner",
        style,
        lineupViewMode: includeImages ? "card" : "compact",
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("send");
    setErr(null);
    try {
      const res = await fetch("/api/admin/inquiry-auto-proposal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, to }),
      });
      const data = (await res.json()) as { error?: string; to?: string };
      if (!res.ok) throw new Error(data.error ?? `http_${res.status}`);
      setResult((prev) =>
        prev ? { ...prev, msg: `발송 → ${data.to}` } : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send_failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <label className="block text-xs font-display uppercase tracking-[0.18em] text-muted-foreground">
          {isKo ? "캠페인 선택 (선택)" : "Campaign (optional)"}
        </label>
        <select
          className="mt-1 w-full max-w-lg border border-border bg-background px-3 py-2 text-sm"
          value={campaignId}
          onChange={(e) => applyCampaign(e.target.value)}
        >
          <option value="">{isKo ? "— 직접 붙여넣기 —" : "— paste —"}</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.clientCompany}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs font-display uppercase tracking-[0.18em] text-muted-foreground">
          {isKo ? "문의 / 브리프 붙여넣기" : "Paste inquiry / brief"}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="mt-1 w-full border-2 border-border bg-background p-3 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy !== null} onClick={() => void runDry()}>
            {busy === "dry" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isKo ? "매칭 미리보기" : "Preview match"}
          </Button>
          <Link
            href={`/${locale}/admin/inquiry-auto-proposal`}
            className="inline-flex items-center text-xs underline-offset-2 hover:underline"
          >
            {isKo ? "기존 문의 자동 매칭 화면" : "Existing inquiry tool"}
          </Link>
        </div>
      </section>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {result ? <p className="text-sm">{result.msg}</p> : null}

      {step >= 3 && result ? (
        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <p className="font-bold">{isKo ? "미리보기 · 내보내기" : "Preview · export"}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.thumbs.map((t) => (
              <li key={t.name} className="text-sm">
                {t.name}
              </li>
            ))}
          </ul>
          {result.snapshot ? (
            <p className="text-xs text-muted-foreground">
              {`₩${result.snapshot.totalCostWon.toLocaleString("ko-KR")}`}
              {result.snapshot.mixCpmWon != null
                ? ` · CPM ₩${result.snapshot.mixCpmWon.toLocaleString("ko-KR")}`
                : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy !== null || !result.payload}
              onClick={() => void exportFile("pdf")}
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null || !result.payload}
              onClick={() => void exportFile("pptx")}
            >
              PPTX
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="test@tkad.co.kr"
              className="border border-border bg-background px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void sendTest()}
            >
              <Send className="mr-2 h-4 w-4" />
              {isKo ? "테스트 발송" : "Test send"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CampaignTrack({
  isKo,
  locale,
  step,
  style,
  includeImages,
  initialCampaignId,
  onReadyForPreview,
}: {
  isKo: boolean;
  locale: string;
  step: AdminReportHubStep;
  style: Parameters<typeof ReportStylePicker>[0]["value"];
  includeImages: boolean;
  initialCampaignId: string | null;
  onReadyForPreview: () => void;
}) {
  const [list, setList] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCampaignId,
  );
  const [detail, setDetail] = useState<{
    scheduleEvents?: { title: string; startsAt: string; endsAt: string; kind: string }[];
    proofPhotos?: { imageUrl: string; caption?: string | null }[];
    mediaBookings?: Parameters<typeof assembleCampaignReportPreviewData>[0]["mediaBookings"];
    financialDocs?: { kind: string; title: string; amountKrw?: number | null; status: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/campaigns")
      .then((r) => r.json())
      .then((j: { campaigns?: CampaignRow[] }) => setList(j.campaigns ?? []))
      .catch(() => setList([]));
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      const j = (await res.json()) as { campaign?: typeof detail; error?: string };
      if (!res.ok) throw new Error(j.error ?? `http_${res.status}`);
      setDetail(j.campaign ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load_failed");
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (initialCampaignId) void loadDetail(initialCampaignId);
  }, [initialCampaignId, loadDetail]);

  const selected = selectedCampaignReportIdentity(list, selectedId);
  const preview =
    selected && detail
      ? assembleCampaignReportPreviewData({
          campaign: selected,
          statusLabel: STATUS_LABEL[selected.status] ?? selected.status,
          scheduleEvents: detail.scheduleEvents,
          proofPhotos: detail.proofPhotos,
          mediaBookings: detail.mediaBookings,
          financialDocs: detail.financialDocs,
          includeImages,
        })
      : null;

  async function sendReport() {
    if (!selectedId) return;
    if (
      !window.confirm(
        isKo
          ? "결과 리포트를 생성하고 고객 이메일로 발송할까요?\n(PDF 생성 · reportGeneratedAt 기록 · 상태 completed)"
          : "Generate and email the completion report?",
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const j = await postGenerateCampaignCompletionReport(selectedId, style);
      if (!j.ok) {
        setErr(j.error ?? "generate_failed");
        return;
      }
      window.alert(
        `리포트 발행 완료.\n${j.emailed ? "이메일 발송 완료" : "이메일은 미발송(주소/설정 확인)"}\nreportGeneratedAt: ${j.reportGeneratedAt ?? "—"}`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <label className="block text-xs font-display uppercase tracking-[0.18em] text-muted-foreground">
          {isKo ? "CRM 캠페인" : "CRM campaign"}
        </label>
        <select
          className="mt-1 w-full max-w-lg border border-border bg-background px-3 py-2 text-sm"
          value={selectedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) void loadDetail(id);
            else {
              setSelectedId(null);
              setDetail(null);
            }
          }}
        >
          <option value="">{isKo ? "캠페인을 선택하세요" : "Select a campaign"}</option>
          {list.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.clientCompany} · {STATUS_LABEL[c.status]}
            </option>
          ))}
        </select>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              setShowPreview(true);
              onReadyForPreview();
            }}
          >
            {isKo ? "미리보기로" : "Go to preview"}
          </Button>
          {selectedId ? (
            <Link
              href={`/${locale}${buildAdminCampaignsReportPath(selectedId)}`}
              className="inline-flex items-center text-xs underline-offset-2 hover:underline"
            >
              {isKo ? "기존 캠페인 3버튼 화면" : "Open campaigns 3-button UI"}
            </Link>
          ) : null}
        </div>
      </section>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {step >= 3 && selectedId ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-0">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="-ml-[2px] inline-flex items-center justify-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black hover:bg-bx-black hover:text-bx-white"
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview
                ? isKo
                  ? "미리보기 닫기"
                  : "Close preview"
                : isKo
                  ? "보고서 미리보기"
                  : "Preview report"}
            </button>
            <a
              href={campaignCompletionReportHref(selectedId, style)}
              className="-ml-[2px] inline-flex items-center justify-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black hover:bg-bx-black hover:text-bx-white"
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="h-3.5 w-3.5" />
              {isKo ? "간단 PDF" : "Simple PDF"}
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendReport()}
              className="-ml-[2px] inline-flex items-center justify-center gap-1.5 border-2 border-bx-black bg-bx-accent px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black hover:bg-bx-black hover:text-bx-white disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              {busy ? "처리 중…" : isKo ? "리포트 생성·발송" : "Generate · send"}
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-tight text-bx-gray-dim">
            {`// `}미리보기 / 간단 PDF / 생성·발송 — /admin/campaigns 와 동일 API
          </p>
          {showPreview && preview ? (
            <CampaignReportPreview data={preview} style={style} />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
