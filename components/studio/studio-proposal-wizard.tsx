"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, FileText, Download, ChevronLeft, Sparkles } from "lucide-react";
import {
  PROPOSAL_TYPES,
  PROPOSAL_TYPE_META,
  PROPOSAL_GOALS,
  sectionsForType,
  PROPOSAL_SECTION_META,
  type ProposalType,
  type ProposalGoal,
  type GeneralProposalOutput,
  type ProposalSectionType,
  type StudioProposalInput,
} from "@/lib/proposal/types";
import { StudioProposalContent } from "@/components/proposal/studio-proposal-content";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";

const REGION_OPTIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "제주"];
const GOAL_LABEL: Record<ProposalGoal, string> = {
  awareness: "브랜드 인지",
  conversion: "전환·실적",
  event: "이벤트·프로모션",
};

const field =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-hermes/30 dark:border-white/12 dark:bg-white/5 dark:text-white";

type GenResult = {
  input: StudioProposalInput;
  type: ProposalType;
  sections: ProposalSectionType[];
  output: GeneralProposalOutput;
};

export function StudioProposalWizard({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ProposalType>("campaign");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [goal, setGoal] = useState<ProposalGoal>("awareness");
  const [budgetManwon, setBudgetManwon] = useState("3000");
  const [regions, setRegions] = useState<string[]>(["서울"]);
  const [targetAge, setTargetAge] = useState("");
  const [freeRequest, setFreeRequest] = useState("");

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const toggleRegion = (r: string) =>
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const generate = useCallback(async () => {
    setError(null);
    if (!brandName.trim() || !industry.trim()) {
      setError(isKo ? "브랜드명과 업종은 필수입니다." : "Brand and industry are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/studio/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          brandName: brandName.trim(),
          industry: industry.trim(),
          campaignName: campaignName.trim(),
          goal,
          budgetManwon: Math.max(0, parseInt(budgetManwon || "0", 10) || 0),
          regions,
          targetAge: targetAge.trim(),
          freeRequest: freeRequest.trim(),
          locale: isKo ? "ko" : "en",
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setError(isKo ? "PRO 플랜 또는 로그인이 필요합니다." : "PRO or login required.");
        return;
      }
      const d = (await res.json()) as GenResult & { error?: string };
      if (!res.ok || d.error) throw new Error(d.error || "fail");
      setResult(d);
      setStep(3);
    } catch {
      setError(isKo ? "생성에 실패했습니다. 잠시 후 다시 시도해 주세요." : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }, [type, brandName, industry, campaignName, goal, budgetManwon, regions, targetAge, freeRequest, isKo]);

  const downloadPdf = useCallback(async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const name = `THINKAD_제안서_${(brandName || "proposal").replace(/\s+/g, "_")}.pdf`;
      await downloadPdfFromHtmlElement(docRef.current, name);
    } finally {
      setDownloading(false);
    }
  }, [brandName]);

  const downloadPptx = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/studio/proposal/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("pptx fail");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `THINKAD_제안서_${(brandName || "proposal").replace(/\s+/g, "_")}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(isKo ? "PPT 생성 실패" : "PPT failed");
    } finally {
      setDownloading(false);
    }
  }, [result, brandName, isKo]);

  // STEP 1 — 유형 선택
  if (step === 1) {
    return (
      <div className="mt-8">
        <Stepper step={1} isKo={isKo} />
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          {isKo ? "1. 제안서 유형 선택" : "1. Choose a type"}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROPOSAL_TYPES.map((t) => {
            const m = PROPOSAL_TYPE_META[t];
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  "rounded-2xl border p-5 text-left transition-ui " +
                  (active
                    ? "border-hermes bg-hermes/5 ring-1 ring-hermes/30 dark:bg-hermes/10"
                    : "border-gray-200 bg-white hover:border-hermes/30 dark:border-white/10 dark:bg-white/5")
                }
              >
                <p className="text-2xl" aria-hidden>{m.emoji}</p>
                <p className="mt-2 font-bold text-gray-900 dark:text-white">{isKo ? m.ko : m.en}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.descKo}</p>
              </button>
            );
          })}
        </div>
        <SectionPreview type={type} isKo={isKo} />
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-hermes px-6 text-sm font-bold text-white hover:bg-cta-hover"
          >
            {isKo ? "다음" : "Next"}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2 — 정보 입력
  if (step === 2) {
    return (
      <div className="mt-8">
        <Stepper step={2} isKo={isKo} />
        <button type="button" onClick={() => setStep(1)} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> {isKo ? "유형 변경" : "Change type"}
        </button>
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          {isKo ? "2. 정보 입력" : "2. Enter details"}{" "}
          <span className="text-sm font-normal text-hermes">{PROPOSAL_TYPE_META[type].emoji} {isKo ? PROPOSAL_TYPE_META[type].ko : PROPOSAL_TYPE_META[type].en}</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "브랜드/주체 *" : "Brand *"}</span>
            <input className={field} value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={isKo ? "예: 싱커드" : "Brand"} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "업종 *" : "Industry *"}</span>
            <input className={field} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={isKo ? "예: F&B, 뷰티, IT" : "Industry"} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "제안명" : "Proposal name"}</span>
            <input className={field} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder={isKo ? "예: 2026 봄 신제품 런칭" : "Name"} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "목적" : "Goal"}</span>
            <select className={field} value={goal} onChange={(e) => setGoal(e.target.value as ProposalGoal)}>
              {PROPOSAL_GOALS.map((g) => (
                <option key={g} value={g}>{isKo ? GOAL_LABEL[g] : g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "예산 (만원)" : "Budget (10k KRW)"}</span>
            <input className={field} type="number" min={0} value={budgetManwon} onChange={(e) => setBudgetManwon(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "타깃 (연령·특성)" : "Target"}</span>
            <input className={field} value={targetAge} onChange={(e) => setTargetAge(e.target.value)} placeholder={isKo ? "예: 20-30대 직장인" : "e.g. 20-30s"} />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "지역" : "Regions"}</span>
            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegion(r)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                    (regions.includes(r)
                      ? "border-hermes bg-hermes/10 text-hermes dark:text-hermes"
                      : "border-gray-200 text-gray-600 dark:border-white/10 dark:text-white/60")
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">{isKo ? "자유 요청 (선택)" : "Free request (optional)"}</span>
            <textarea className={field} rows={3} value={freeRequest} onChange={(e) => setFreeRequest(e.target.value)} placeholder={isKo ? "추가로 강조하고 싶은 내용을 적어주세요" : "Anything to emphasize"} />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-hermes px-6 text-sm font-bold text-white hover:bg-cta-hover disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? (isKo ? "AI 생성 중..." : "Generating...") : isKo ? "AI 제안서 생성" : "Generate"}
          </button>
        </div>
      </div>
    );
  }

  // STEP 3 — 미리보기 + 다운로드
  return (
    <div className="mt-8">
      <Stepper step={3} isKo={isKo} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> {isKo ? "수정" : "Edit"}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-hermes px-4 text-sm font-bold text-white hover:bg-cta-hover disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </button>
          <button
            type="button"
            onClick={() => void downloadPptx()}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-hermes/30 px-4 text-sm font-bold text-hermes disabled:opacity-60 dark:border-hermes/30 dark:text-hermes"
          >
            <Download className="h-4 w-4" />
            PPT
          </button>
        </div>
      </div>
      {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}
      {result ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-white/10">
          <div ref={docRef} data-quote-pdf-background="#ffffff">
            <StudioProposalContent
              input={result.input}
              type={result.type}
              sections={result.sections}
              output={result.output}
              isKo={isKo}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionPreview({ type, isKo }: { type: ProposalType; isKo: boolean }) {
  const sections = sectionsForType(type);
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white/60 p-3 text-xs dark:border-white/10 dark:bg-white/5">
      <span className="font-semibold text-muted-foreground">{isKo ? "포함 섹션: " : "Sections: "}</span>
      {sections.map((s, i) => (
        <span key={s} className="text-gray-700 dark:text-white/70">
          {i > 0 ? " · " : ""}
          {isKo ? PROPOSAL_SECTION_META[s].ko : PROPOSAL_SECTION_META[s].en}
        </span>
      ))}
    </div>
  );
}

function Stepper({ step, isKo }: { step: 1 | 2 | 3; isKo: boolean }) {
  const labels = isKo ? ["유형", "정보", "생성·다운로드"] : ["Type", "Details", "Generate"];
  return (
    <div className="mb-6 flex items-center gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n <= step;
        return (
          <div key={l} className="flex items-center gap-2">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                (active ? "bg-hermes text-white" : "bg-gray-200 text-gray-500 dark:bg-white/10")
              }
            >
              {n}
            </span>
            <span className={"text-xs font-semibold " + (active ? "text-hermes dark:text-hermes" : "text-muted-foreground")}>{l}</span>
            {i < 2 ? <span className="mx-1 h-px w-6 bg-gray-300 dark:bg-white/20" /> : null}
          </div>
        );
      })}
    </div>
  );
}
