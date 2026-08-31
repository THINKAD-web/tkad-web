"use client";

/**
 * 프리셋 선택 UI — 빠른 추천·자세히 설계 공용 (PART I).
 *
 * 기본은 풀에서 3개 shuffle 노출(G-4: 무작위 값 채우기 아님, 대표 캠페인 예시).
 * 프리셋이 15개로 늘면서 원하는 걸 찾으려면 몇 번씩 shuffle 해야 하는 문제가
 * 생겨 "전체 보기" 토글을 추가했다 — 카테고리 분류는 프리셋이 더 늘어날 때
 * 재검토(15개 정도는 한 화면에 다 펼쳐도 스캔 가능한 양).
 *
 * 무엇을 채울지는 호출자가 결정한다(onSelect) — 빠른 추천은 예산·지역만,
 * 자세히 설계는 전체 브리프를 채운다.
 */

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  BRIEF_PRESETS,
  BRIEF_PRESET_DISPLAY_COUNT,
  nextBriefPresetSeed,
  pickBriefPresetsExcluding,
  type BriefPreset,
} from "@/lib/planner/brief/presets";

function randomPresetSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

function PresetButton({
  preset,
  isKo,
  onSelect,
  dense,
}: {
  preset: BriefPreset;
  isKo: boolean;
  onSelect: (preset: BriefPreset) => void;
  dense?: boolean;
}) {
  const t = preset[isKo ? "ko" : "en"];
  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={`rounded-lg border border-border bg-muted/40 text-left hover:border-primary/50 ${
        dense ? "px-2.5 py-1.5" : "px-3 py-1.5"
      }`}
      title={t.summary}
    >
      <span className="tkad-type-title">{t.title}</span>
      <span className="block tkad-type-caption text-muted-foreground">
        {t.summary}
      </span>
    </button>
  );
}

export function BriefPresetPicker({
  isKo,
  onSelect,
  label,
}: {
  isKo: boolean;
  onSelect: (preset: BriefPreset) => void;
  /** 섹션 앞머리 라벨 — 빠른 추천/자세히 설계에서 문구가 다르다 */
  label?: string;
}) {
  const [presetSeed, setPresetSeed] = useState(0);
  const [excludePresetIds, setExcludePresetIds] = useState<readonly string[]>(
    [],
  );
  const [isRefreshingPresets, setIsRefreshingPresets] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setExcludePresetIds([]);
    setPresetSeed(randomPresetSeed());
  }, []);

  const visiblePresets = useMemo(() => {
    if (presetSeed === 0) {
      return BRIEF_PRESETS.slice(0, BRIEF_PRESET_DISPLAY_COUNT);
    }
    return pickBriefPresetsExcluding(
      BRIEF_PRESET_DISPLAY_COUNT,
      presetSeed,
      excludePresetIds,
    );
  }, [presetSeed, excludePresetIds]);

  const handleShuffle = () => {
    setIsRefreshingPresets(true);
    window.setTimeout(() => {
      setExcludePresetIds(visiblePresets.map((p) => p.id));
      setPresetSeed((seed) => nextBriefPresetSeed(seed || randomPresetSeed()));
      setIsRefreshingPresets(false);
    }, 160);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="self-center text-xs text-muted-foreground">
        {label ?? (isKo ? "또는 프리셋:" : "or preset:")}
      </span>

      {showAll ? (
        <div className="flex w-full flex-wrap gap-2">
          {BRIEF_PRESETS.map((p) => (
            <PresetButton
              key={p.id}
              preset={p}
              isKo={isKo}
              onSelect={onSelect}
              dense
            />
          ))}
        </div>
      ) : (
        visiblePresets.map((p) => (
          <PresetButton key={p.id} preset={p} isKo={isKo} onSelect={onSelect} />
        ))
      )}

      {!showAll ? (
        <button
          type="button"
          onClick={handleShuffle}
          disabled={isRefreshingPresets}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw
            className={isRefreshingPresets ? "size-3.5 animate-spin" : "size-3.5"}
          />
          {isKo ? "다른 예시 보기" : "More examples"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
      >
        {showAll ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        {showAll
          ? isKo
            ? "접기"
            : "Collapse"
          : isKo
            ? `전체 보기 (${BRIEF_PRESETS.length})`
            : `View all (${BRIEF_PRESETS.length})`}
      </button>
    </div>
  );
}
