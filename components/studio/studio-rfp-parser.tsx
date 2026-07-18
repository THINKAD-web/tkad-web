"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Search,
  X,
  RotateCcw,
  FileDown,
} from "lucide-react";
import type {
  RfpCampaignMeta,
  RfpGroup,
  RfpProposalBrief,
} from "@/lib/rfp-proposal/types";
import type {
  RfpGroupMatchResult,
  RfpMatchedMediaSummary,
} from "@/lib/rfp-proposal/match-rfp-brief";
import { formatMediaPriceCompactWon } from "@/lib/media-price-format";
import { downloadRfpProposalFromMatch } from "@/lib/rfp-proposal-export/client";

const field =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-hermes/30 dark:border-white/12 dark:bg-white/5 dark:text-white";

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

type MatchState = {
  groups: RfpGroupMatchResult[];
  catalogCount: number;
};

export function StudioRfpParser({ locale }: { locale: string }) {
  const isKo = locale === "ko";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"claude" | "heuristic" | null>(null);
  const [brief, setBrief] = useState<RfpProposalBrief | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  /** groupId → 제외한 매체 ID */
  const [excludedByGroup, setExcludedByGroup] = useState<
    Record<string, string[]>
  >({});
  /** groupId → 수동 추가(핀) 매체 ID */
  const [includedByGroup, setIncludedByGroup] = useState<
    Record<string, string[]>
  >({});
  const [addIdDraft, setAddIdDraft] = useState<Record<string, string>>({});
  const [recommendComment, setRecommendComment] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const parse = async () => {
    setError(null);
    setSavedNote(null);
    setMatchState(null);
    setMatchError(null);
    setExcludedByGroup({});
    setIncludedByGroup({});
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
    setSavedNote(
      isKo
        ? `확인됨 — ${brief.groups.length}개 그룹. 아래에서 매체 매칭을 실행하세요.`
        : `Confirmed — ${brief.groups.length} groups. Run media matching below.`,
    );
  };

  const runMatchWith = async (
    nextExcluded: Record<string, string[]>,
    nextIncluded: Record<string, string[]>,
  ) => {
    if (!brief) return;
    setMatchError(null);
    setMatchLoading(true);
    try {
      const res = await fetch("/api/studio/rfp/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          locale: isKo ? "ko" : "en",
          limitPerGroup: 8,
          excludedByGroup: nextExcluded,
          includedByGroup: nextIncluded,
        }),
      });
      const data = (await res.json()) as {
        groups?: RfpGroupMatchResult[];
        catalogCount?: number;
        error?: string;
      };
      if (!res.ok || !data.groups) {
        setMatchError(
          data.error || (isKo ? "매칭에 실패했습니다." : "Match failed."),
        );
        return;
      }
      setMatchState({
        groups: data.groups,
        catalogCount: data.catalogCount ?? 0,
      });
    } catch {
      setMatchError(isKo ? "네트워크 오류" : "Network error");
    } finally {
      setMatchLoading(false);
    }
  };

  const runMatch = async () => {
    await runMatchWith(excludedByGroup, includedByGroup);
  };

  const excludeMedia = (groupId: string, mediaId: string) => {
    setExcludedByGroup((prev) => {
      const cur = prev[groupId] ?? [];
      if (cur.includes(mediaId)) return prev;
      return { ...prev, [groupId]: [...cur, mediaId] };
    });
    setIncludedByGroup((prev) => {
      const cur = prev[groupId] ?? [];
      if (!cur.includes(mediaId)) return prev;
      return { ...prev, [groupId]: cur.filter((id) => id !== mediaId) };
    });
    setMatchState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map((g) =>
          g.groupId !== groupId
            ? g
            : {
                ...g,
                mediaItems: g.mediaItems.filter((m) => m.mediaId !== mediaId),
              },
        ),
      };
    });
  };

  const restoreExcluded = (groupId: string, mediaId: string) => {
    const nextExcluded = {
      ...excludedByGroup,
      [groupId]: (excludedByGroup[groupId] ?? []).filter((id) => id !== mediaId),
    };
    setExcludedByGroup(nextExcluded);
    void runMatchWith(nextExcluded, includedByGroup);
  };

  const addMediaById = async (groupId: string) => {
    const mediaId = (addIdDraft[groupId] ?? "").trim();
    if (!mediaId || !brief) return;
    const nextIncluded = {
      ...includedByGroup,
      [groupId]: [
        ...new Set([...(includedByGroup[groupId] ?? []), mediaId]),
      ],
    };
    const nextExcluded = {
      ...excludedByGroup,
      [groupId]: (excludedByGroup[groupId] ?? []).filter((id) => id !== mediaId),
    };
    setIncludedByGroup(nextIncluded);
    setExcludedByGroup(nextExcluded);
    setAddIdDraft((prev) => ({ ...prev, [groupId]: "" }));
    await runMatchWith(nextExcluded, nextIncluded);
  };

  const visibleItems = (
    group: RfpGroupMatchResult,
  ): RfpMatchedMediaSummary[] => {
    const excluded = new Set(excludedByGroup[group.groupId] ?? []);
    return group.mediaItems.filter((m) => !excluded.has(m.mediaId));
  };

  const hasMatchResults =
    !!matchState &&
    matchState.groups.some((g) => visibleItems(g).length > 0);

  const exportProposal = async () => {
    if (!brief || !matchState) return;
    setExportError(null);
    setExportLoading(true);
    try {
      await downloadRfpProposalFromMatch({
        brief,
        matchGroups: matchState.groups,
        excludedByGroup,
        locale: isKo ? "ko" : "en",
        recommendComment: recommendComment.trim() || null,
      });
    } catch (e) {
      setExportError(
        e instanceof Error
          ? e.message
          : isKo
            ? "제안서 생성에 실패했습니다."
            : "Proposal export failed.",
      );
    } finally {
      setExportLoading(false);
    }
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
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-hermes px-5 text-sm font-bold text-white hover:bg-cta-hover disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isKo ? "그룹 구조화" : "Structure groups"}
          </button>
          <span className="text-xs text-muted-foreground">{text.length.toLocaleString()} chars</span>
          {source && (
            <span className="rounded-full bg-hermes/10 px-2.5 py-0.5 text-xs font-medium text-hermes dark:bg-hermes/20 dark:text-hermes">
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

      {brief && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {isKo ? "3. 그룹별 매체 매칭" : "3. Match media by group"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isKo
                  ? "각 권역 그룹을 독립 MatchingInput으로 변환해 카탈로그를 매칭합니다."
                  : "Each region group is matched independently against the catalog."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runMatch}
                disabled={matchLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-hermes px-5 text-sm font-bold text-white hover:bg-cta-hover disabled:opacity-60"
              >
                {matchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isKo ? "매체 매칭" : "Match media"}
              </button>
              <button
                type="button"
                onClick={() => void exportProposal()}
                disabled={!hasMatchResults || exportLoading || matchLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-5 text-sm font-bold text-white disabled:opacity-40 dark:border-white dark:bg-white dark:text-gray-900"
              >
                {exportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {isKo ? "제안서 생성" : "Generate proposal"}
              </button>
            </div>
          </div>
          {matchError && <p className="text-sm text-red-600">{matchError}</p>}
          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
          {matchState && (
            <p className="text-xs text-muted-foreground">
              {isKo
                ? `카탈로그 ${matchState.catalogCount.toLocaleString()}건 기준 · ${matchState.groups.length}개 그룹`
                : `${matchState.catalogCount.toLocaleString()} catalog items · ${matchState.groups.length} groups`}
            </p>
          )}

          {hasMatchResults && (
            <label className="block text-xs text-muted-foreground">
              {isKo
                ? "타겟 맞춤 추천 코멘트 (선택 · PDF 반영)"
                : "Target recommendation comment (optional · in PDF)"}
              <textarea
                rows={3}
                className={`${field} mt-1`}
                value={recommendComment}
                onChange={(e) => setRecommendComment(e.target.value)}
                placeholder={
                  isKo
                    ? "예: 공항·핵심상권 DOOH로 인지도, 지하철 PSD로 반복 노출을 제안합니다."
                    : "Optional narrative for the proposal PDF…"
                }
              />
            </label>
          )}

          {matchState?.groups.map((g) => {
            const items = visibleItems(g);
            const excluded = excludedByGroup[g.groupId] ?? [];
            return (
              <div
                key={g.groupId}
                className="rounded-2xl border border-gray-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5"
              >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {g.groupLabel}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {items.length}
                    {isKo ? "건" : " items"}
                  </span>
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  regions: {g.input.regions.join(", ") || "—"}
                  {g.input.categories?.length
                    ? ` · categories: ${g.input.categories.join(", ")}`
                    : ""}
                  {g.input.mediaIntents?.length
                    ? ` · intents: ${g.input.mediaIntents.join(", ")}`
                    : ""}
                </p>

                <ul className="mt-3 space-y-2">
                  {items.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      {isKo ? "매칭 결과 없음" : "No matches"}
                    </li>
                  )}
                  {items.map((m) => (
                    <li
                      key={m.mediaId}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <Link
                            href={`/${locale}/media/${m.mediaId}`}
                            className="text-sm font-semibold text-gray-900 underline-offset-2 hover:underline dark:text-white"
                          >
                            {isKo ? m.name : m.nameEn || m.name}
                          </Link>
                          {m.pinned && (
                            <span className="text-[10px] font-medium text-hermes">
                              {isKo ? "수동 추가" : "pinned"}
                            </span>
                          )}
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatMediaPriceCompactWon(
                              m.priceWon,
                              isKo ? "ko-KR" : "en-US",
                            )}
                            {" · "}
                            {Math.round(m.score)}pt
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {isKo ? m.location : m.locationEn || m.location}
                        </p>
                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                          {m.oneLine}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => excludeMedia(g.groupId, m.mediaId)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label={isKo ? "제외" : "Exclude"}
                        title={isKo ? "매칭에서 제외" : "Exclude from match"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                {excluded.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {isKo ? "제외됨" : "Excluded"}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {excluded.map((id) => (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <span className="truncate font-mono">{id}</span>
                          <button
                            type="button"
                            onClick={() => restoreExcluded(g.groupId, id)}
                            className="inline-flex items-center gap-1 text-hermes hover:underline"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {isKo ? "복원" : "Restore"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    className={`${field} max-w-xs flex-1`}
                    placeholder={
                      isKo ? "매체 ID로 추가…" : "Add by media ID…"
                    }
                    value={addIdDraft[g.groupId] ?? ""}
                    onChange={(e) =>
                      setAddIdDraft((prev) => ({
                        ...prev,
                        [g.groupId]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addMediaById(g.groupId);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addMediaById(g.groupId)}
                    disabled={matchLoading || !(addIdDraft[g.groupId] ?? "").trim()}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold disabled:opacity-40 dark:border-white/15"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isKo ? "추가" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
