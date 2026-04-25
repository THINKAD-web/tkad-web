"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Clock, AlertTriangle, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  computeQuoteTotals,
  inclusiveCampaignDays,
  type LineInput,
  type PriceUnitHint,
  type QuoteTotals,
} from "@/lib/pricing";
import {
  isoToDate,
  useQuoteStore,
} from "@/lib/quote/store";
import {
  QUOTE_MAX_DAYS,
  QUOTE_MIN_DAYS,
  type QuoteIsoDate,
  type QuoteTimeSlot,
} from "@/lib/quote/types";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";

const PRESETS: ReadonlyArray<{ key: string; days: number }> = [
  { key: "1week", days: 7 },
  { key: "2weeks", days: 14 },
  { key: "1month", days: 30 },
  { key: "3months", days: 90 },
  { key: "6months", days: 180 },
  { key: "1year", days: 365 },
];

function todayIso(): QuoteIsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysIso(baseIso: QuoteIsoDate, days: number): QuoteIsoDate {
  const d = new Date(baseIso + "T00:00:00");
  d.setDate(d.getDate() + days - 1); // -1 for inclusive end
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const HINT_PRICE_OPT: PriceUnitHint = "auto";

type Props = {
  /** 1단계에서 선택된 매체. */
  selectedMedia: MediaItem[];
  /** 1단계에서 매체별 우선 가격 옵션 인덱스. */
  priceOptionIndices: Record<string, number>;
  /** 1단계 네트워크 옵션. */
  networkOptions: Record<string, { units: number; regionScope: string }>;
};

/**
 * 견적 마법사 2단계 — 캠페인 기간 + 송출 옵션 + 예산 + 가용성 검증.
 * lib/pricing 의 computeQuoteTotals 를 호출해 매체와 동일한 가격 식을 사용한다.
 */
export function QuotePeriodStep({
  selectedMedia,
  priceOptionIndices,
  networkOptions,
}: Props) {
  const t = useTranslations("quote.period2");
  const startDateIso = useQuoteStore((s) => s.startDateIso);
  const endDateIso = useQuoteStore((s) => s.endDateIso);
  const timeSlot = useQuoteStore((s) => s.timeSlot);
  const budgetKrw = useQuoteStore((s) => s.budgetKrw);
  const setStartDate = useQuoteStore((s) => s.setStartDate);
  const setEndDate = useQuoteStore((s) => s.setEndDate);
  const setTimeSlot = useQuoteStore((s) => s.setTimeSlot);
  const setBudget = useQuoteStore((s) => s.setBudget);

  const minStart = useMemo(() => addDaysIso(todayIso(), 8), []); // 오늘 + 7일 (preparation)
  const maxEnd = useMemo(() => addDaysIso(todayIso(), QUOTE_MAX_DAYS + 1), []);

  const startDate = isoToDate(startDateIso);
  const endDate = isoToDate(endDateIso);
  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return inclusiveCampaignDays(startDate, endDate);
  }, [startDate, endDate]);

  const applyPreset = (presetDays: number) => {
    const start = startDateIso ?? minStart;
    setStartDate(start);
    setEndDate(addDaysIso(start, presetDays));
  };

  const hasDigital = useMemo(
    () => selectedMedia.some((m) => m.type === "digital"),
    [selectedMedia],
  );

  // 가용성 경고 — Media.availability !== "available" 인 매체 목록.
  const unavailableMedia = useMemo(
    () => selectedMedia.filter((m) => m.availability && m.availability !== "available"),
    [selectedMedia],
  );

  const totals: QuoteTotals | null = useMemo(() => {
    if (!startDate || !endDate || days < 1) return null;
    const lines: LineInput[] = selectedMedia.map((m) => ({
      media: m,
      priceOptionIndex: priceOptionIndices[m.id],
      networkUnits: networkOptions[m.id]?.units,
    }));
    return computeQuoteTotals({
      lines,
      start: startDate,
      end: endDate,
      hint: HINT_PRICE_OPT,
      multiplierCtx: { timeSlot },
    });
  }, [
    startDate,
    endDate,
    days,
    selectedMedia,
    priceOptionIndices,
    networkOptions,
    timeSlot,
  ]);

  const budgetExceeded =
    totals != null && budgetKrw != null && totals.totalKrw > budgetKrw;

  // 검증 경고 메시지
  const dateError = useMemo(() => {
    if (!startDate && !endDate) return null;
    if (!startDate || !endDate) return t("errorBothDates");
    if (endDate < startDate) return t("errorEndBeforeStart");
    if (days < QUOTE_MIN_DAYS) return t("errorTooShort", { min: QUOTE_MIN_DAYS });
    if (days > QUOTE_MAX_DAYS) return t("errorTooLong", { max: QUOTE_MAX_DAYS });
    return null;
  }, [startDate, endDate, days, t]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("desc")}</p>

      {/* 빠른 프리셋 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-navy">{t("presetTitle")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = days === p.days;
            return (
              <Button
                key={p.key}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(p.days)}
                className={cn(
                  "min-w-[72px]",
                  active && "bg-gold text-navy hover:bg-gold/90",
                )}
              >
                {t(`presets.${p.key}`)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 날짜 입력 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="quote-start-date"
            className="mb-1 block text-sm font-semibold text-navy"
          >
            <CalendarDays className="mr-1.5 inline h-4 w-4 text-gold" />
            {t("startDate")}
          </label>
          <Input
            id="quote-start-date"
            type="date"
            value={startDateIso ?? ""}
            min={minStart}
            max={endDateIso ?? maxEnd}
            onChange={(e) => setStartDate(e.target.value || null)}
          />
        </div>
        <div>
          <label
            htmlFor="quote-end-date"
            className="mb-1 block text-sm font-semibold text-navy"
          >
            <CalendarDays className="mr-1.5 inline h-4 w-4 text-gold" />
            {t("endDate")}
          </label>
          <Input
            id="quote-end-date"
            type="date"
            value={endDateIso ?? ""}
            min={startDateIso ?? minStart}
            max={maxEnd}
            onChange={(e) => setEndDate(e.target.value || null)}
          />
        </div>
      </div>

      {/* 일수 + 검증 메시지 */}
      <div className="rounded-lg border bg-slate-50 px-3 py-2.5 text-xs">
        <span className="font-medium text-navy">{t("dayCountLabel")}</span>{" "}
        <Badge variant="secondary" className="ml-1">
          {t("dayCount", { days })}
        </Badge>
        {dateError ? (
          <p className="mt-1.5 flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {dateError}
          </p>
        ) : null}
      </div>

      {/* 가용성 경고 */}
      {unavailableMedia.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {t("availabilityWarn", { count: unavailableMedia.length })}
          </p>
          <ul className="mt-2 ml-5 list-disc text-amber-900">
            {unavailableMedia.map((m) => (
              <li key={m.id}>
                {m.name} —{" "}
                <span className="text-amber-700">
                  {m.availability === "reserved"
                    ? t("availabilityReserved")
                    : t("availabilityMaintenance")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 송출 시간대 — 디지털 매체가 있을 때만 */}
      {hasDigital ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Clock className="h-4 w-4 text-gold" aria-hidden />
            {t("timeSlotTitle")}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("timeSlotHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["all_day", "rush_hour", "lunch_evening", "night"] as const).map(
              (slot) => {
                const active = timeSlot === slot;
                return (
                  <Button
                    key={slot}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeSlot(slot as QuoteTimeSlot)}
                    className={cn(
                      active && "bg-gold text-navy hover:bg-gold/90",
                    )}
                  >
                    {t(`timeSlots.${slot}`)}
                  </Button>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      {/* 예산 (선택) */}
      <div>
        <label
          htmlFor="quote-budget"
          className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-navy"
        >
          <Wallet className="h-4 w-4 text-gold" aria-hidden />
          {t("budgetLabel")}
        </label>
        <p className="mb-2 text-xs text-muted-foreground">{t("budgetHint")}</p>
        <Input
          id="quote-budget"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000000}
          value={budgetKrw ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setBudget(null);
              return;
            }
            const n = parseInt(raw, 10);
            if (Number.isFinite(n) && n >= 0) setBudget(n);
          }}
          placeholder={t("budgetPlaceholder")}
          className="max-w-xs"
        />
      </div>

      {/* 라이브 견적 미리보기 */}
      {totals ? (
        <div
          className={cn(
            "rounded-xl border-2 p-4",
            budgetExceeded
              ? "border-red-300 bg-red-50"
              : "border-gold/40 bg-gold/5",
          )}
        >
          <p className="mb-3 text-sm font-semibold text-navy">
            {t("livePreviewTitle")}
          </p>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{t("subtotal")}</dt>
            <dd className="text-right font-medium text-navy">
              {formatMediaPriceWonWithSymbol(totals.subtotalKrw)}
            </dd>
            {totals.discount.rate > 0 ? (
              <>
                <dt className="text-muted-foreground">
                  {totals.discount.label}
                </dt>
                <dd className="text-right font-medium text-emerald-700">
                  −{formatMediaPriceWonWithSymbol(
                    totals.subtotalKrw - totals.discountedKrw,
                  )}
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">{t("vat")}</dt>
            <dd className="text-right text-navy">
              {formatMediaPriceWonWithSymbol(totals.vatKrw)}
            </dd>
            <dt className="text-base font-semibold text-navy">{t("total")}</dt>
            <dd className="text-right text-base font-bold text-navy">
              {formatMediaPriceWonWithSymbol(totals.totalKrw)}
            </dd>
            <dt className="col-span-2 mt-1 text-xs text-muted-foreground">
              {t("perDay", {
                price: formatMediaPriceWonWithSymbol(totals.perDayKrw),
              })}
            </dt>
          </dl>
          {budgetExceeded && budgetKrw != null ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {t("budgetExceeded", {
                over: formatMediaPriceWonWithSymbol(
                  totals.totalKrw - budgetKrw,
                ),
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-navy/15 bg-slate-50 px-3 py-3 text-center text-sm text-muted-foreground">
          {t("livePreviewHint")}
        </p>
      )}
    </div>
  );
}
