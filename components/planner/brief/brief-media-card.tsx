"use client";

/**
 * 빠른 추천·믹스 편집 공용 매체 카드.
 *
 * 두 화면 다 scoreMediaCandidates() 결과를 같은 사용자가 같은 흐름에서 보므로
 * 카드 스타일·정보량이 달라야 할 이유가 없다 — 유지보수 지점을 하나로 둔다.
 * 빠른 추천만 있는 정보(순위)는 `rank` prop 으로만 갈린다.
 */

import type { ScoredMedia } from "@/lib/planner/brief/scoring";
import { Button } from "@/components/ui/button";
import { PlannerMediaThumb } from "@/components/planner/planner-media-thumb";

const AXIS_LABEL: Record<string, { ko: string; en: string }> = {
  target: { ko: "타깃 적합", en: "Target fit" },
  budget: { ko: "예산 효율", en: "Budget efficiency" },
  region: { ko: "지역 적합", en: "Region fit" },
  industry: { ko: "업종 적합", en: "Industry fit" },
};

export function BriefMediaCard({
  scored,
  units,
  isKo,
  days,
  onAdd,
  onRemove,
  onUnits,
  rank,
  testIdPrefix,
}: {
  scored: ScoredMedia;
  units: number;
  isKo: boolean;
  days: number;
  onAdd: () => void;
  onRemove: () => void;
  onUnits: (n: number) => void;
  /** 빠른 추천 랭킹 배지 — Step 2 믹스 편집에는 없다 */
  rank?: number;
  /** E2E 테스트 훅 접두사 (예: "brief-quick-rank") */
  testIdPrefix?: string;
}) {
  const { media, axes, total } = scored;
  const selected = units > 0;
  const mediaName = isKo ? media.name : media.nameEn || media.name;
  const testId = (suffix: string) =>
    testIdPrefix ? `${testIdPrefix}-${suffix}` : undefined;

  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      data-testid={testId("row")}
      data-selected={selected ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        {rank != null ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums">
            {rank}
          </span>
        ) : null}
        <PlannerMediaThumb
          media={media}
          alt={mediaName}
          size="card"
          isKo={isKo}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate tkad-type-title">{mediaName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isKo ? media.location : media.locationEn || media.location}
            </p>
            {scored.overBudget ? (
              <p className="mt-0.5 tkad-type-note font-medium text-amber-700 dark:text-amber-300">
                {isKo ? "예산 초과" : "Over budget"}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold tabular-nums">
            {total}
          </span>
        </div>
      </div>

      {/* 추천 근거 — 근거를 못 쓰는 축은 애초에 없다 */}
      {axes.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {axes.map((a) => (
            <li key={a.key} className="tkad-type-caption leading-snug">
              <span className="font-medium">
                {AXIS_LABEL[a.key]?.[isKo ? "ko" : "en"] ?? a.key} {a.score}
              </span>
              <span className="text-muted-foreground"> ← {a.rationale}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 tkad-type-caption text-muted-foreground">
          {isKo
            ? "이 매체에 대해 근거를 쓸 수 있는 축이 없습니다."
            : "No axis with a stateable rationale for this media."}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        {selected ? (
          <>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => onUnits(units - 1)}
                aria-label={isKo ? "수량 감소" : "Decrease"}
              >
                −
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">
                {units}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => onUnits(units + 1)}
                aria-label={isKo ? "수량 증가" : "Increase"}
              >
                +
              </Button>
            </div>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={onRemove}
              data-testid={testId("remove")}
            >
              {isKo ? "제거" : "Remove"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="xs"
            onClick={onAdd}
            data-testid={testId("add")}
          >
            {isKo ? "믹스에 추가" : "Add to mix"}
          </Button>
        )}
        <span className="tkad-type-caption text-muted-foreground sm:ml-auto">
          {scored.unitCpmWon != null
            ? `CPM ₩${scored.unitCpmWon.toLocaleString()} / ${days}${isKo ? "일" : "d"}`
            : isKo
              ? "CPM 산정 중"
              : "CPM pending"}
        </span>
      </div>
    </li>
  );
}
