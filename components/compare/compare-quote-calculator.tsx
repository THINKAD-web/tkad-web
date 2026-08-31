"use client";

import { useMemo, useState } from "react";
import { Calculator, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import { buildPlannerHrefWithMediaIds } from "@/lib/planner-media-href";
import {
  aggregateQuoteLines,
  buildQuoteContactHref,
  calculateMediaQuoteByDays,
  calculateMediaQuoteFromOption,
  durationToDays,
  findCheapestPriceOptionIndex,
  formatWonShort,
  type QuoteDurationUnit,
} from "@/lib/compare-quote";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  items: MediaItem[];
  isKo: boolean;
  className?: string;
};

const DURATION_PRESETS: { value: number; unit: QuoteDurationUnit; labelKo: string; labelEn: string }[] =
  [
    { value: 2, unit: "week", labelKo: "2주", labelEn: "2 weeks" },
    { value: 1, unit: "month", labelKo: "1개월", labelEn: "1 month" },
    { value: 3, unit: "month", labelKo: "3개월", labelEn: "3 months" },
  ];

export function CompareQuoteCalculator({ items, isKo, className }: Props) {
  const locale = isKo ? "ko" : "en";
  const localeTag = isKo ? "ko-KR" : "en-US";

  const [durationUnit, setDurationUnit] = useState<QuoteDurationUnit>("month");
  const [durationValue, setDurationValue] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(items.map((m) => m.id)),
  );

  const effectiveDuration = useMemo(() => {
    if (useDateRange && dateFrom && dateTo) {
      const a = new Date(dateFrom);
      const b = new Date(dateTo);
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && b >= a) {
        const days = Math.ceil((b.getTime() - a.getTime()) / 86_400_000) + 1;
        return { days: Math.max(1, days), label: `${dateFrom} ~ ${dateTo}` };
      }
    }
    const days = durationToDays(durationValue, durationUnit);
    const unitLabel = isKo
      ? durationUnit === "day"
        ? "일"
        : durationUnit === "week"
          ? "주"
          : "개월"
      : durationUnit;
    return {
      days,
      label: `${durationValue}${unitLabel}`,
    };
  }, [
    useDateRange,
    dateFrom,
    dateTo,
    durationValue,
    durationUnit,
    isKo,
  ]);

  const selectedItems = useMemo(
    () => items.filter((m) => selectedIds.has(m.id)),
    [items, selectedIds],
  );

  const totals = useMemo(() => {
    const lines = selectedItems.map((m) => {
      const opts = m.priceOptions ?? [];
      if (opts.length > 0) {
        const idx = findCheapestPriceOptionIndex(m);
        return calculateMediaQuoteFromOption(
          m,
          opts[idx]!,
          effectiveDuration.days,
        );
      }
      return calculateMediaQuoteByDays(m, effectiveDuration.days);
    });
    return aggregateQuoteLines(lines);
  }, [selectedItems, effectiveDuration.days]);

  function toggleMedia(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const contactHref = buildQuoteContactHref({
    mediaIds: selectedItems.map((m) => m.id),
    durationDays: effectiveDuration.days,
    totals,
    locale,
    includeVat: false,
  });

  const plannerHref = buildPlannerHrefWithMediaIds(
    selectedItems.map((m) => m.id),
  );

  const inputCls =
    "h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/12 border-gray-200 dark:bg-black bg-white/30 dark:text-white text-gray-900";

  return (
    <section
      className={cn(
        "mt-10 rounded-2xl border-2 border-border bg-card p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:mt-12 sm:p-6",
        className,
      )}
      id="compare-quote-calculator"
    >
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 tkad-type-label text-accent">
            <Calculator className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "인스턴트 견적" : "Instant quote"}
          </p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
            {isKo ? "집행 기간·매체로 예상 비용 계산" : "Estimate by duration & media"}
          </h2>
        </div>
        <BtnBlock href={plannerHref} variant="accent" size="sm" className="shrink-0">
          {isKo ? "이 조합으로 플래너 시작" : "Start planner with selection"}
        </BtnBlock>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 tkad-type-title dark:border-white/12 border-gray-200">
              <input
                type="radio"
                name="durationMode"
                checked={!useDateRange}
                onChange={() => setUseDateRange(false)}
              />
              {isKo ? "기간 단위" : "By unit"}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 tkad-type-title dark:border-white/12 border-gray-200">
              <input
                type="radio"
                name="durationMode"
                checked={useDateRange}
                onChange={() => setUseDateRange(true)}
              />
              {isKo ? "날짜 선택" : "Date range"}
            </label>
          </div>

          {!useDateRange ? (
            <>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={`${p.unit}-${p.value}`}
                    type="button"
                    onClick={() => {
                      setDurationUnit(p.unit);
                      setDurationValue(p.value);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 tkad-type-label transition-colors",
                      durationUnit === p.unit && durationValue === p.value
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50",
                    )}
                  >
                    {isKo ? p.labelKo : p.labelEn}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block tkad-type-label text-muted-foreground">
                    {isKo ? "기간" : "Duration"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationValue}
                    onChange={(e) =>
                      setDurationValue(Math.max(1, Number(e.target.value) || 1))
                    }
                    className={cn(inputCls, "w-24")}
                  />
                </div>
                <div>
                  <label className="mb-1 block tkad-type-label text-muted-foreground">
                    {isKo ? "단위" : "Unit"}
                  </label>
                  <select
                    value={durationUnit}
                    onChange={(e) =>
                      setDurationUnit(e.target.value as QuoteDurationUnit)
                    }
                    className={cn(inputCls, "min-w-[7rem]")}
                  >
                    <option value="day">{isKo ? "일" : "Days"}</option>
                    <option value="week">{isKo ? "주" : "Weeks"}</option>
                    <option value="month">{isKo ? "월" : "Months"}</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="mb-1 block tkad-type-label text-muted-foreground">
                  {isKo ? "시작일" : "From"}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block tkad-type-label text-muted-foreground">
                  {isKo ? "종료일" : "To"}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 tkad-type-label text-muted-foreground">
              {isKo ? "포함 매체" : "Media included"}
            </p>
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 transition-colors hover:bg-muted/70 dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleMedia(m.id)}
                      className="rounded border-border"
                    />
                    <span className="min-w-0 flex-1 tkad-type-title text-foreground">
                      {isKo ? m.name : m.nameEn || m.name}
                    </span>
                    <span className="shrink-0 tkad-type-caption tabular-nums text-muted-foreground">
                      {formatCatalogPriceFieldWon(m.price, localeTag)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-border bg-muted/30 p-4 dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 sm:p-5">
          <p className="tkad-type-label text-muted-foreground">
            {isKo ? "견적 요약" : "Quote summary"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKo ? "집행" : "Flight"}: {effectiveDuration.label} (
            {effectiveDuration.days}
            {isKo ? "일" : "d"})
          </p>

          <ul className="mt-4 space-y-2 border-b border-border/50 pb-4">
            {totals.lines.map((line) => (
              <li
                key={line.mediaId}
                className="flex justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate text-foreground/90">
                  {line.name}
                </span>
                <span className="shrink-0 tkad-type-meta font-bold tabular-nums">
                  {formatWonShort(line.costWon, locale)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {isKo ? "합계 (VAT 별도)" : "Subtotal (excl. VAT)"}
              </dt>
              <dd className="font-bold tabular-nums text-foreground">
                {formatWonShort(totals.subtotalWon, locale)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 text-xs">
              <dt className="text-muted-foreground">VAT 10%</dt>
              <dd className="tabular-nums">{formatWonShort(totals.vatWon, locale)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {isKo ? "예상 총 노출" : "Est. impressions"}
              </dt>
              <dd className="font-bold tabular-nums text-[color:var(--qp-accent)]">
                {totals.totalImpressions.toLocaleString(localeTag)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {isKo ? "평균 CPM" : "Avg. CPM"}
              </dt>
              <dd className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {totals.avgCpm
                  ? `₩${totals.avgCpm.toLocaleString(localeTag)}`
                  : "—"}
              </dd>
            </div>
          </dl>

          <MediaPriceExclNote isKo={isKo} className="mt-3" />

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <BtnBlock
              href={contactHref}
              variant="accent"
              size="md"
              className="w-full justify-center sm:flex-1"
            >
              <MessageSquare className="h-4 w-4" />
              {isKo ? "이 견적으로 문의하기" : "Inquire with this quote"}
            </BtnBlock>
            <Link
              href={plannerHref}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[22px] border border-border bg-card px-4 text-center tkad-type-title text-foreground transition-colors hover:bg-muted dark:border-white/12 border-gray-200"
            >
              {isKo ? "플래너" : "Planner"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
