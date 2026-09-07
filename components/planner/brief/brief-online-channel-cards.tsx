"use client";

/**
 * O-1 / PART3-5 + PR3 — digital_only 채널 카드 (Step 2 mix 편집 · Step 3 결과 공용).
 * 값은 recommendOnlineCatalogChannels() / reallocateOnlineBudget() 산출값 그대로.
 */

import { useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  ExcludedForBudgetEntry,
  ScoredOnlinePlatformGroup,
} from "@/lib/planner/recommend-online-catalog";

function formatMetricRange(min: number, max: number, isKo: boolean): string {
  if (min === 0 && max === 0) {
    return isKo ? "추정 불가 (단가 정보 없음)" : "Not estimable (no rate data)";
  }
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  return min === max ? fmt(min) : `${fmt(min)} ~ ${fmt(max)}`;
}

function OnlineChannelCardBody({
  group,
  isKo,
}: {
  group: ScoredOnlinePlatformGroup;
  isKo: boolean;
}) {
  const metricLabel =
    group.metricType === "clicks"
      ? isKo
        ? "예상 클릭"
        : "Est. clicks"
      : isKo
        ? "예상 노출"
        : "Est. impressions";
  const productName = isKo
    ? group.topProduct.name
    : group.topProduct.nameEn || group.topProduct.name;

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate tkad-type-title">{group.platform}</p>
          <p className="mt-0.5 truncate tkad-type-caption text-muted-foreground">
            {productName}
            {group.otherProductCount > 0
              ? isKo
                ? ` 외 ${group.otherProductCount}건`
                : ` +${group.otherProductCount} more`
              : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 tkad-type-note font-semibold tabular-nums text-primary">
          {group.budgetPct}%
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tkad-type-caption">
        <dt className="text-muted-foreground">{isKo ? "배정 예산" : "Budget"}</dt>
        <dd className="text-right font-medium tabular-nums">
          {group.budgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
          {isKo ? "만원" : "M KRW"}
        </dd>
        <dt className="text-muted-foreground">{metricLabel}</dt>
        <dd className="text-right font-medium tabular-nums">
          {formatMetricRange(group.estimatedMetricMin, group.estimatedMetricMax, isKo)}
        </dd>
      </dl>
      <p className="mt-2 tkad-type-caption leading-relaxed text-muted-foreground">
        {isKo ? group.reasonKo : group.reasonEn}
      </p>
    </>
  );
}

/** Step 3 등 읽기 전용 카드 */
export function OnlineChannelCard({
  group,
  isKo,
}: {
  group: ScoredOnlinePlatformGroup;
  isKo: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-3"
      data-testid="brief-online-channel-card"
    >
      <OnlineChannelCardBody group={group} isKo={isKo} />
    </div>
  );
}

/** PR3 Step 2 — mix 편집용 (BriefMediaCard 재사용 X) */
export function OnlineMixChannelCard({
  group,
  isKo,
  variant,
  onAdd,
  onRemove,
}: {
  group: ScoredOnlinePlatformGroup;
  isKo: boolean;
  variant: "selected" | "pool";
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3",
        variant === "selected" ? "border-primary/30" : "border-border",
      )}
      data-testid={
        variant === "selected"
          ? "brief-online-mix-selected-card"
          : "brief-online-mix-pool-card"
      }
    >
      <OnlineChannelCardBody group={group} isKo={isKo} />
      <div className="mt-3 flex justify-end">
        {variant === "selected" && onRemove ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            data-testid="brief-online-mix-remove"
          >
            <Minus className="mr-1 h-3.5 w-3.5" />
            {isKo ? "제거" : "Remove"}
          </Button>
        ) : null}
        {variant === "pool" && onAdd ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAdd}
            data-testid="brief-online-mix-add"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {isKo ? "추가" : "Add"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OnlineExcludedForBudgetSection({
  entries,
  isKo,
  onForceAdd,
}: {
  entries: readonly ExcludedForBudgetEntry[];
  isKo: boolean;
  onForceAdd?: (mediaId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-muted/20"
      data-testid="brief-online-excluded-for-budget"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <span className="tkad-type-caption font-medium text-muted-foreground">
          {isKo
            ? `참고 · 관련성은 높지만 예산 부족으로 제외된 채널 ${entries.length}개`
            : `Note · ${entries.length} relevant channel(s) excluded for budget`}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="space-y-2 border-t border-border p-3 pt-2">
          {entries.map((e) => (
            <li
              key={e.platform}
              className="flex flex-wrap items-center justify-between gap-2"
              data-testid="brief-online-excluded-row"
            >
              <span className="tkad-type-caption text-muted-foreground">
                {isKo ? e.reasonKo : e.reasonEn}
              </span>
              {onForceAdd ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={() => onForceAdd(e.topProductMediaId)}
                  data-testid="brief-online-excluded-force-add"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {isKo ? "강제 추가" : "Force add"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
