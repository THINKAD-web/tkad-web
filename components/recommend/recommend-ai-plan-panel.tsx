"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useIsPro } from "@/hooks/use-is-pro";
import {
  Sparkles,
  Loader2,
  Lock,
  FileText,
  FileDown,
  ChevronDown,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { CampaignProposalOutput, ProposalInput } from "@/lib/proposal/types";
import { planDefaults, type PlanEditableFields } from "@/lib/recommend-plan-input";
import { buildPlanExportPayload } from "@/lib/recommend-plan-export";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { cn } from "@/lib/utils";

/**
 * AI 플래너 2단계 — 추천 결과로 실제 집행 플랜(예산배분·일정·근거) 생성 + PDF/PPT.
 * PRO 전용. 보강 필드(브랜드·캠페인명·기간)는 규칙 기반 기본값 자동채움 + 인라인 수정.
 */
type Props = {
  locale: string;
  brief: AiRecommendInput;
  /** 플랜에 포함할 추천 매체(상위 N 또는 카트) */
  mediaItems: MediaItem[];
};

export default function RecommendAiPlanPanel({ locale, brief, mediaItems }: Props) {
  const isKo = locale === "ko";
  const router = useRouter();
  const { isPro, loading: proLoading } = useIsPro();

  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<PlanEditableFields>(() =>
    planDefaults(brief, isKo),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<CampaignProposalOutput | null>(null);
  const [planInput, setPlanInput] = useState<ProposalInput | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number>(5);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  const notPro = !proLoading && !isPro;

  const generate = useCallback(async () => {
    if (mediaItems.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          mediaIds: mediaItems.slice(0, 20).map((m) => m.id),
          fields,
          locale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        proposal?: CampaignProposalOutput;
        input?: ProposalInput;
        remaining?: number;
        limit?: number;
        message?: string;
      };
      if (res.status === 403) {
        setError(data.message ?? (isKo ? "PRO 전용 기능입니다." : "PRO only."));
        return;
      }
      if (res.status === 429) {
        setRemaining(0);
        if (typeof data.limit === "number") setLimit(data.limit);
        setError(data.message ?? (isKo ? "한도를 초과했어요." : "Quota exceeded."));
        return;
      }
      if (!res.ok || !data.ok || !data.proposal || !data.input) {
        setError(data.message ?? (isKo ? "플랜 생성에 실패했습니다." : "Failed."));
        return;
      }
      setProposal(data.proposal);
      setPlanInput(data.input);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);
    } catch {
      setError(isKo ? "요청에 실패했습니다." : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [brief, mediaItems, fields, locale, isKo]);

  const exportDoc = useCallback(
    async (format: "pdf" | "pptx") => {
      if (!proposal || !planInput) return;
      setExporting(format);
      try {
        const payload = buildPlanExportPayload(
          proposal,
          planInput,
          mediaItems,
          isKo,
        );
        await downloadPlannerReport(format, payload);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : isKo
              ? "내보내기에 실패했습니다."
              : "Export failed.",
        );
      } finally {
        setExporting(null);
      }
    },
    [proposal, planInput, mediaItems, isKo],
  );

  const setField = (k: keyof PlanEditableFields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  const inputCls =
    "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white";

  return (
    <div className="mt-6 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/70 to-cyan-50/40 p-5 dark:border-violet-500/25 dark:from-violet-500/10 dark:to-cyan-500/5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {isKo ? "AI 집행 플랜 생성" : "AI campaign plan"}
        </p>
        <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
          PRO
        </span>
        {remaining != null ? (
          <span className="ml-auto text-[11px] font-medium text-gray-500 dark:text-white/55">
            {isKo ? `오늘 ${remaining}/${limit} 남음` : `${remaining}/${limit} left today`}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-white/60">
        {isKo
          ? "추천 매체로 예산 배분·집행 일정·매체별 선정 근거가 담긴 플랜을 만들고 PDF/PPT로 받습니다."
          : "Turn the recommendation into a plan with budget split, timeline and rationale — export to PDF/PPT."}
      </p>

      {notPro ? (
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600"
        >
          <Lock className="h-4 w-4" />
          {isKo ? "PRO로 업그레이드" : "Upgrade to PRO"}
        </button>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
        >
          <Sparkles className="h-4 w-4" />
          {isKo ? "이 추천으로 플랜 만들기" : "Build a plan"}
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {/* 보강 입력 (기본값 자동채움 + 인라인 수정) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 dark:text-white/60">
                {isKo ? "브랜드명" : "Brand"}
              </span>
              <input
                value={fields.brandName}
                onChange={(e) => setField("brandName", e.target.value)}
                placeholder={isKo ? "브랜드명" : "Brand name"}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 dark:text-white/60">
                {isKo ? "캠페인명" : "Campaign"}
              </span>
              <input
                value={fields.campaignName}
                onChange={(e) => setField("campaignName", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 dark:text-white/60">
                {isKo ? "시작일" : "Start"}
              </span>
              <input
                type="date"
                value={fields.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 dark:text-white/60">
                {isKo ? "종료일" : "End"}
              </span>
              <input
                type="date"
                value={fields.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-white/40">
            {isKo
              ? `추천 매체 ${Math.min(20, mediaItems.length)}개 · 예산 ${brief.budgetMaxMan ? `${brief.budgetMaxMan.toLocaleString("ko-KR")}만원` : "자동"} 기준`
              : `${Math.min(20, mediaItems.length)} media · budget ${brief.budgetMaxMan || "auto"}`}
          </p>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isKo ? "플랜 생성" : "Generate plan"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-xs font-medium text-rose-500">{error}</p>
      ) : null}

      {proposal && planInput ? (
        <PlanResult
          isKo={isKo}
          proposal={proposal}
          exporting={exporting}
          onExport={exportDoc}
        />
      ) : null}
    </div>
  );
}

function PlanResult({
  isKo,
  proposal,
  exporting,
  onExport,
}: {
  isKo: boolean;
  proposal: CampaignProposalOutput;
  exporting: "pdf" | "pptx" | null;
  onExport: (f: "pdf" | "pptx") => void;
}) {
  const loc = isKo ? "ko-KR" : "en-US";
  const totalWon = proposal.budgetAllocation.reduce((s, b) => s + b.amountWon, 0);
  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: isKo ? "예상 노출" : "Impr.", v: proposal.metrics.estimatedImpressions.toLocaleString(loc) },
          { l: isKo ? "예상 도달" : "Reach", v: proposal.metrics.estimatedReach.toLocaleString(loc) },
          { l: "CPM", v: `₩${proposal.metrics.estimatedCpm.toLocaleString(loc)}` },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">{k.l}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-gray-900 dark:text-white">{k.v}</p>
          </div>
        ))}
      </div>

      {/* 예산 배분 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-white/70">
          {isKo ? "예산 배분" : "Budget allocation"}
        </p>
        <div className="space-y-1.5">
          {proposal.budgetAllocation.map((b, i) => (
            <div key={`${b.label}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 truncate text-gray-600 dark:text-white/65">{b.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${Math.min(100, b.sharePct)}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right tabular-nums text-gray-500 dark:text-white/55">{b.sharePct}%</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-right text-[11px] text-gray-400 dark:text-white/40">
          {isKo ? "합계" : "Total"} ₩{totalWon.toLocaleString(loc)}
        </p>
      </div>

      {/* 매체별 근거 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-white/70">
          {isKo ? "매체별 선정 근거" : "Media rationale"}
        </p>
        <ul className="space-y-1.5">
          {proposal.mediaMix.map((m) => (
            <li key={m.mediaId} className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 text-xs dark:border-white/10 dark:bg-white/5">
              <p className="font-semibold text-gray-900 dark:text-white">
                {m.mediaName}
                <span className="ml-1.5 rounded bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300">
                  {m.role} · {m.budgetSharePct}%
                </span>
              </p>
              <p className="mt-0.5 text-gray-600 dark:text-white/60">{m.rationale}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 타임라인 */}
      {proposal.timeline.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-white/70">
            {isKo ? "집행 타임라인" : "Timeline"}
          </p>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-white/60">
            {proposal.timeline.map((t, i) => (
              <li key={`${t.phase}-${i}`}>
                <span className="font-medium text-gray-800 dark:text-white/80">{t.phase}</span>
                <span className="text-gray-400 dark:text-white/40"> ({t.period})</span>: {t.tasks.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 내보내기 */}
      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => onExport("pdf")}
          disabled={exporting !== null}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60",
          )}
        >
          {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          PDF
        </button>
        <button
          type="button"
          onClick={() => onExport("pptx")}
          disabled={exporting !== null}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 disabled:opacity-60 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-500/10"
        >
          {exporting === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          PPT
        </button>
      </div>
    </div>
  );
}
