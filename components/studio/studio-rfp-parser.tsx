"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import type { RfpCampaignMeta, RfpGroup, RfpProposalBrief } from "@/lib/rfp-proposal/types";

const field =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-white/12 dark:bg-white/5 dark:text-white";

function emptyGroup(index: number): RfpGroup {
  return {
    id: `manual-${index + 1}`,
    label: "",
    regionKeywords: [],
    mediaTypeKeywords: [],
    budget: null,
    period: null,
    constraints: [],
    packageHints: [],
  };
}

function csvToList(v: string): string[] {
  return v
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function listToCsv(arr: string[] | undefined): string {
  return (arr ?? []).join(", ");
}

export function StudioRfpParser({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"claude" | "heuristic" | null>(null);
  const [brief, setBrief] = useState<RfpProposalBrief | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const parse = async () => {
    setError(null);
    setSavedNote(null);
    if (text.trim().length < 40) {
      setError(isKo ? "RFP 본문을 40자 이상 붙여넣어 주세요." : "Paste at least 40 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/studio/rfp/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale: isKo ? "ko" : "en" }),
      });
      const data = (await res.json()) as {
        brief?: RfpProposalBrief;
        source?: "claude" | "heuristic";
        error?: string;
      };
      if (!res.ok || !data.brief) {
        setError(data.error || (isKo ? "파싱에 실패했습니다." : "Parse failed."));
        return;
      }
      setBrief(data.brief);
      setSource(data.source ?? null);
    } catch {
      setError(isKo ? "네트워크 오류" : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = (index: number, patch: Partial<RfpGroup>) => {
    if (!brief) return;
    const groups = brief.groups.map((g, i) => (i === index ? { ...g, ...patch } : g));
    setBrief({ ...brief, groups });
  };

  const updateCampaign = (patch: Partial<RfpCampaignMeta>) => {
    if (!brief) return;
    setBrief({ ...brief, campaign: { ...(brief.campaign ?? {}), ...patch } });
  };

  const addGroup = () => {
    if (!brief) return;
    setBrief({
      ...brief,
      groups: [...brief.groups, emptyGroup(brief.groups.length)],
    });
  };

  const removeGroup = (index: number) => {
    if (!brief || brief.groups.length <= 1) return;
    setBrief({
      ...brief,
      groups: brief.groups.filter((_, i) => i !== index),
    });
  };

  const confirmEdits = () => {
    if (!brief) return;
    // MVP: 로컬 확인만 (다음 티켓에서 매칭 연결)
    setSavedNote(
      isKo
        ? `확인됨 — ${brief.groups.length}개 그룹 (매칭/PDF는 다음 단계)`
        : `Confirmed — ${brief.groups.length} groups (match/PDF next)`,
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {isKo ? "1. RFP 원문 붙여넣기" : "1. Paste RFP"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isKo
            ? "이메일 본문 등 장문 RFP를 붙여넣으면 권역 그룹으로 구조화합니다. 결과는 아래에서 수정할 수 있습니다."
            : "Paste a long RFP email. AI extracts region groups; you can edit the result below."}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder={
            isKo
              ? "예: [RFP] … 공항 권역 / 핵심 상권 / 지하철 역사 …"
              : "Paste full RFP body…"
          }
          className={`${field} mt-3 min-h-[220px] font-mono text-[13px] leading-relaxed`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={parse}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isKo ? "그룹 구조화" : "Structure groups"}
          </button>
          <span className="text-xs text-muted-foreground">{text.length.toLocaleString()} chars</span>
          {source && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
              source: {source}
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {brief && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isKo ? "2. 추출 결과 확인·수정" : "2. Review & edit"}
            </h2>
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold dark:border-white/15"
            >
              <Plus className="h-3.5 w-3.5" />
              {isKo ? "그룹 추가" : "Add group"}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {isKo ? "공통 캠페인 정보" : "Campaign meta"}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Brand
                <input
                  className={`${field} mt-1`}
                  value={brief.campaign?.brandName ?? ""}
                  onChange={(e) => updateCampaign({ brandName: e.target.value || null })}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {isKo ? "시기" : "Period"}
                <input
                  className={`${field} mt-1`}
                  value={brief.campaign?.period ?? ""}
                  onChange={(e) => updateCampaign({ period: e.target.value || null })}
                />
              </label>
              <label className="block text-xs text-muted-foreground sm:col-span-2">
                {isKo ? "타겟" : "Target"}
                <input
                  className={`${field} mt-1`}
                  value={brief.campaign?.target ?? ""}
                  onChange={(e) => updateCampaign({ target: e.target.value || null })}
                />
              </label>
              <label className="block text-xs text-muted-foreground sm:col-span-2">
                {isKo ? "업종" : "Industry"}
                <input
                  className={`${field} mt-1`}
                  value={brief.campaign?.industry ?? ""}
                  onChange={(e) => updateCampaign({ industry: e.target.value || null })}
                />
              </label>
            </div>
          </div>

          {brief.groups.map((g, i) => (
            <div
              key={g.id}
              className="rounded-2xl border border-gray-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <label className="block flex-1 text-xs text-muted-foreground">
                  {isKo ? `그룹 ${i + 1} 라벨` : `Group ${i + 1} label`}
                  <input
                    className={`${field} mt-1 font-semibold`}
                    value={g.label}
                    onChange={(e) => updateGroup(i, { label: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeGroup(i)}
                  disabled={brief.groups.length <= 1}
                  className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 disabled:opacity-30"
                  aria-label="Remove group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                <label className="block text-xs text-muted-foreground">
                  regionKeywords (comma-separated)
                  <textarea
                    rows={2}
                    className={`${field} mt-1`}
                    value={listToCsv(g.regionKeywords)}
                    onChange={(e) =>
                      updateGroup(i, { regionKeywords: csvToList(e.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  mediaTypeKeywords (comma-separated)
                  <textarea
                    rows={2}
                    className={`${field} mt-1`}
                    value={listToCsv(g.mediaTypeKeywords)}
                    onChange={(e) =>
                      updateGroup(i, { mediaTypeKeywords: csvToList(e.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  constraints
                  <textarea
                    rows={2}
                    className={`${field} mt-1`}
                    value={listToCsv(g.constraints)}
                    onChange={(e) =>
                      updateGroup(i, { constraints: csvToList(e.target.value) })
                    }
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  packageHints
                  <textarea
                    rows={2}
                    className={`${field} mt-1`}
                    value={listToCsv(g.packageHints)}
                    onChange={(e) =>
                      updateGroup(i, { packageHints: csvToList(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={confirmEdits}
              className="inline-flex h-10 items-center rounded-xl bg-gray-900 px-5 text-sm font-bold text-white dark:bg-white dark:text-gray-900"
            >
              {isKo ? "수정 내용 확인" : "Confirm edits"}
            </button>
            {savedNote && (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {savedNote}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
