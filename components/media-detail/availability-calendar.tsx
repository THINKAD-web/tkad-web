"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  dayIsBlocked,
  diffDaysInclusive,
  formatRangeDate,
  isDayInRange,
  rangeHasBlockedDays,
  startOfDay,
  ymdLocal,
} from "@/lib/calendar-date-range";
import {
  computeMonthAvailabilityStats,
  formatEstimatedCostWon,
  getMonthDateRange,
} from "@/lib/media-availability-stats";
import { computeInstantBookingAmount } from "@/lib/instant-booking-pricing";
import {
  catalogPriceFieldToWon,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import type { MediaPricePeriodKey } from "@/lib/media-data";
import { cn } from "@/lib/utils";

type Props = {
  mediaId: string;
  mediaName: string;
  instantBookingEligible?: boolean;
  /** 카탈로그 price 필드 (원 또는 만원) */
  catalogPrice?: number;
  pricePeriod?: MediaPricePeriodKey | string | null;
  /** MediaBooking 이력이 거의 없을 때 정직 안내 */
  availabilitySparse?: boolean;
};

type BlockedRange = {
  start: string;
  end: string;
  status: "blocked";
};

type AvailabilityResponse = {
  mediaId: string;
  from: string;
  to: string;
  blockedRanges: BlockedRange[];
};

const MAX_FORWARD_MONTHS = 3;
const MAX_BACKWARD_MONTHS = 0;

function buildMonthCells(viewMonth: Date): ({ date: Date; day: number } | null)[] {
  const y = viewMonth.getFullYear();
  const mo = viewMonth.getMonth();
  const first = new Date(y, mo, 1);
  const last = new Date(y, mo + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const cells: ({ date: Date; day: number } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({ day: d, date: new Date(y, mo, d) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function MediaAvailabilityCalendar({
  mediaId,
  mediaName,
  instantBookingEligible = false,
  catalogPrice = 0,
  pricePeriod = "month",
  availabilitySparse = false,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("mediaDetail.availability");
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthlyPriceWon = useMemo(
    () => catalogPriceFieldToWon(catalogPrice),
    [catalogPrice],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromD = today;
        const toD = new Date(
          today.getFullYear(),
          today.getMonth() + MAX_FORWARD_MONTHS + 1,
          0,
        );
        const url = `/api/public/media/${encodeURIComponent(mediaId)}/availability?from=${ymdLocal(fromD)}&to=${ymdLocal(toD)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AvailabilityResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "fetch failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [mediaId, today]);

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const blockedRanges = useMemo(() => data?.blockedRanges ?? [], [data]);

  const viewMonthStats = useMemo(() => {
    const { start, end } = getMonthDateRange(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
    );
    return computeMonthAvailabilityStats(blockedRanges, start, end, today);
  }, [blockedRanges, today, viewMonth]);

  const isCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() &&
    viewMonth.getMonth() === today.getMonth();

  const canGoBack = (() => {
    const earliest = new Date(
      today.getFullYear(),
      today.getMonth() - MAX_BACKWARD_MONTHS,
      1,
    );
    return viewMonth > earliest;
  })();
  const canGoForward = (() => {
    const latest = new Date(
      today.getFullYear(),
      today.getMonth() + MAX_FORWARD_MONTHS,
      1,
    );
    return viewMonth < latest;
  })();

  const stats = useMemo(() => {
    let blockedDays = 0;
    let totalFutureDays = 0;
    for (const cell of cells) {
      if (!cell) continue;
      if (cell.date < today) continue;
      totalFutureDays++;
      if (dayIsBlocked(cell.date, blockedRanges)) blockedDays++;
    }
    return {
      blockedDays,
      availableDays: totalFutureDays - blockedDays,
      totalFutureDays,
    };
  }, [cells, blockedRanges, today]);

  const rangeComplete = rangeStart !== null && rangeEnd !== null;
  const rangeDays =
    rangeComplete && rangeStart && rangeEnd
      ? diffDaysInclusive(rangeStart, rangeEnd)
      : 0;

  const estimatedCostWon = useMemo(() => {
    if (!rangeComplete || !rangeStart || !rangeEnd || monthlyPriceWon <= 0) {
      return 0;
    }
    return computeInstantBookingAmount(
      {
        price: monthlyPriceWon,
        pricePeriod: normalizeMediaPricePeriod(pricePeriod),
      },
      rangeStart,
      rangeEnd,
    );
  }, [
    monthlyPriceWon,
    pricePeriod,
    rangeComplete,
    rangeEnd,
    rangeStart,
  ]);

  const contactHref = rangeComplete
    ? `/contact?media=${encodeURIComponent(mediaId)}&from=${ymdLocal(rangeStart!)}&to=${ymdLocal(rangeEnd!)}`
    : null;

  const bookHref = rangeComplete
    ? `/media/${encodeURIComponent(mediaId)}/book?from=${ymdLocal(rangeStart!)}&to=${ymdLocal(rangeEnd!)}`
    : null;

  const applyQuickRange = useCallback(
    (start: Date, end: Date) => {
      const s = startOfDay(start);
      const e = startOfDay(end);
      if (e < today) return;
      const effectiveStart = s < today ? today : s;
      if (rangeHasBlockedDays(effectiveStart, e, blockedRanges)) return;
      setRangeStart(effectiveStart);
      setRangeEnd(e);
      setViewMonth(
        new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1),
      );
    },
    [blockedRanges, today],
  );

  const onQuickThisMonth = useCallback(() => {
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    applyQuickRange(today, end);
  }, [applyQuickRange, today]);

  const onQuickNextMonth = useCallback(() => {
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    applyQuickRange(start, end);
  }, [applyQuickRange, today]);

  const onQuickTwoWeeks = useCallback(() => {
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    applyQuickRange(today, end);
  }, [applyQuickRange, today]);

  const onDayClick = useCallback(
    (day: Date) => {
      if (day < today) return;
      if (dayIsBlocked(day, blockedRanges)) return;

      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(day);
        setRangeEnd(null);
        return;
      }

      if (day < rangeStart) {
        setRangeStart(day);
        setRangeEnd(null);
        return;
      }

      if (rangeHasBlockedDays(rangeStart, day, blockedRanges)) {
        setRangeStart(day);
        setRangeEnd(null);
        return;
      }

      setRangeEnd(day);
    },
    [blockedRanges, rangeEnd, rangeStart, today],
  );

  const weekdays =
    locale === "ko"
      ? ["월", "화", "수", "목", "금", "토", "일"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const monthLabel =
    locale === "ko"
      ? `${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`
      : viewMonth.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });

  return (
    <section
      aria-labelledby="availability-calendar-heading"
      className="mt-12 border-t border-border/70 pt-12"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tkad-type-label text-accent">
            [ {t("eyebrow")} ]
          </p>
          <h2
            id="availability-calendar-heading"
            className="mt-2 text-[length:var(--qp-text-h3)] font-bold tracking-tight text-foreground"
          >
            <CalendarDays
              className="mr-2 inline-block h-5 w-5 text-accent"
              aria-hidden
            />
            {t("title")}
          </h2>
          <p className="mt-1 max-w-xl tkad-type-caption tracking-tight text-muted-foreground">
            {`// `}
            {t("desc")}
          </p>
          {!loading && !error ? (
            <p className="mt-2 tkad-type-title text-foreground">
              {t("monthAvailabilityPct", {
                month: monthLabel,
                pct: viewMonthStats.availabilityPct,
              })}
            </p>
          ) : null}
        </div>

        <div className="inline-flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/50 p-1 shadow-xs backdrop-blur">
          <button
            type="button"
            disabled={!canGoBack || loading}
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
              )
            }
            className="rounded-[14px] px-2.5 py-1.5 text-foreground transition-colors hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[96px] text-center tkad-type-label text-foreground">
            {viewMonth.getFullYear()}.
            {String(viewMonth.getMonth() + 1).padStart(2, "0")}
          </span>
          <button
            type="button"
            disabled={!canGoForward || loading}
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
              )
            }
            className="rounded-[14px] px-2.5 py-1.5 text-foreground transition-colors hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t("nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {availabilitySparse ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100"
        >
          <p className="font-semibold tracking-tight">{t("sparseTitle")}</p>
          <p className="mt-1 tkad-type-body leading-snug opacity-90">
            {t("sparseDesc")}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={onQuickThisMonth}
          className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 tkad-type-label text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {t("quickThisMonth")}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onQuickNextMonth}
          className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 tkad-type-label text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {t("quickNextMonth")}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onQuickTwoWeeks}
          className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 tkad-type-label text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {t("quickTwoWeeks")}
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-[24px] border border-border/80 bg-muted/40 px-4 py-12 tkad-type-label text-muted-foreground shadow-xs backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : error ? (
          <p className="rounded-[22px] border border-accent/60 bg-card/80 px-4 py-3 tkad-type-caption tracking-tight text-accent shadow-xs backdrop-blur">
            {`// `}
            {t("error")}
          </p>
        ) : (
          <>
            <p className="mb-3 tkad-type-label text-muted-foreground">
              {rangeStart && !rangeEnd
                ? t("rangeSelectEnd")
                : t("rangeSelectStart")}
            </p>

            <div className="overflow-x-auto">
              <div className="mx-auto min-w-[320px] max-w-[360px]">
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {weekdays.map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        "tkad-type-note font-black uppercase",
                        i === 6
                          ? "text-accent"
                          : i === 5
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-[3px]">
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={idx} className="aspect-square" />;
                    }
                    const isPast = cell.date < today;
                    const isToday = cell.date.getTime() === today.getTime();
                    const blocked =
                      !isPast && dayIsBlocked(cell.date, blockedRanges);
                    const inRange = isDayInRange(
                      cell.date,
                      rangeStart,
                      rangeEnd,
                    );
                    const isStart =
                      rangeStart?.getTime() === cell.date.getTime();
                    const isEnd =
                      rangeEnd?.getTime() === cell.date.getTime();
                    const selectable = !isPast && !blocked;

                    let cls =
                      "relative flex aspect-square w-full items-center justify-center rounded-[10px] border tkad-type-caption font-black tabular-nums transition-colors";
                    if (isPast) {
                      cls +=
                        " border-transparent bg-transparent text-muted-foreground/40";
                    } else if (blocked) {
                      cls +=
                        " border-accent bg-accent/15 text-accent cursor-not-allowed";
                    } else if (inRange) {
                      cls +=
                        " border-foreground/30 bg-foreground/10 text-foreground";
                    } else {
                      cls +=
                        " border-border bg-card/80 text-foreground hover:border-foreground/40 hover:bg-muted/60";
                    }
                    if (isStart || isEnd) {
                      cls +=
                        " z-[1] border-foreground bg-foreground text-background ring-2 ring-foreground/20";
                    }
                    if (isToday && !isStart && !isEnd) {
                      cls += " ring-1 ring-foreground/70 ring-offset-1";
                    }

                    const label = blocked
                      ? `${ymdLocal(cell.date)} — ${t("dayBlocked")}`
                      : isPast
                        ? t("dayPast")
                        : `${ymdLocal(cell.date)} — ${t("dayAvailable")}`;

                    if (!selectable) {
                      return (
                        <div
                          key={idx}
                          className={cls}
                          aria-label={isPast ? undefined : label}
                          title={
                            blocked
                              ? t("dayBlocked")
                              : isPast
                                ? t("dayPast")
                                : undefined
                          }
                        >
                          <span>{cell.day}</span>
                          {blocked ? (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(135deg,transparent_45%,rgba(255,102,0,0.45)_45%,rgba(255,102,0,0.45)_55%,transparent_55%)]"
                            />
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={cls}
                        onClick={() => onDayClick(cell.date)}
                        aria-label={label}
                        aria-pressed={inRange || isStart}
                        title={label}
                      >
                        <span>{cell.day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 tkad-type-note uppercase text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 border border-border bg-card" />
                {t("legendAvailable")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 border border-accent bg-accent/15" />
                {t("legendBlocked")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 border border-foreground/30 bg-foreground/10" />
                {t("legendSelected")}
              </span>
              {isCurrentMonth ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border border-border ring-1 ring-foreground ring-offset-1" />
                  {t("legendToday")}
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3 border-t border-border/15 pt-4">
              <p className="tkad-type-body leading-relaxed text-foreground">
                {t("statsAvailable", { n: stats.availableDays })}
                {stats.blockedDays > 0
                  ? `  ·  ${t("statsBlocked", { n: stats.blockedDays })}`
                  : null}
              </p>

              {rangeStart ? (
                <div
                  className="rounded-[18px] border border-border/80 bg-muted/30 px-4 py-3"
                  aria-live="polite"
                >
                  <p className="tkad-type-label text-muted-foreground">
                    {t("rangeLabel")}
                  </p>
                  {rangeComplete && rangeStart && rangeEnd ? (
                    <>
                      <p className="mt-1 tkad-type-title text-foreground">
                        {t("rangeSelected", {
                          start: formatRangeDate(rangeStart, locale),
                          end: formatRangeDate(rangeEnd, locale),
                          days: rangeDays,
                        })}
                      </p>
                      {estimatedCostWon > 0 ? (
                        <p className="mt-2 text-sm font-bold text-accent">
                          {t("estimatedCost", {
                            start: formatRangeDate(rangeStart, locale),
                            end: formatRangeDate(rangeEnd, locale),
                            days: rangeDays,
                            cost: formatEstimatedCostWon(
                              estimatedCostWon,
                              locale,
                            ),
                          })}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-foreground">
                      {formatRangeDate(rangeStart, locale)} —{" "}
                      <span className="text-muted-foreground">
                        {t("rangeSelectEnd")}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 tkad-type-note text-muted-foreground">
                    {mediaName}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {contactHref ? (
                  <Link
                    href={contactHref}
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-foreground bg-foreground px-4 py-2.5 text-center tkad-type-label text-background transition-opacity hover:opacity-90"
                  >
                    {t("ctaInquiryPeriod")}
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center justify-center rounded-[14px] border border-border/50 bg-muted/40 px-4 py-2.5 tkad-type-label text-muted-foreground">
                    {t("ctaInquiryPeriod")}
                  </span>
                )}
                {instantBookingEligible && bookHref ? (
                  <Link
                    href={bookHref}
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-accent bg-accent px-4 py-2.5 text-center tkad-type-label text-accent-foreground transition-opacity hover:opacity-95"
                  >
                    {t("ctaInstantBook")}
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
