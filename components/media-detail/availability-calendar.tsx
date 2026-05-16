"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BookingRequestModal } from "@/components/media-detail/booking-request-modal";
import type { PublicDayStatus } from "@/lib/media-availability-month";

type Props = {
  mediaId: string;
  /** 매체 이름 (모달 헤더 노출용) */
  mediaName: string;
  /** 가입 사용자 prefill (선택) */
  userPrefill?: { name?: string; email?: string };
};

type MonthPayload = {
  mediaId: string;
  month: string;
  days: Record<string, PublicDayStatus>;
};

const MAX_FORWARD_MONTHS = 6;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthCells(viewMonth: Date): ({ date: Date; day: number } | null)[] {
  const y = viewMonth.getFullYear();
  const mo = viewMonth.getMonth();
  const first = new Date(y, mo, 1);
  const last = new Date(y, mo + 1, 0);
  // 월요일 시작 (한국 관습)
  const startPad = (first.getDay() + 6) % 7;
  const cells: ({ date: Date; day: number } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({ day: d, date: new Date(y, mo, d) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function statusForDay(
  days: Record<string, PublicDayStatus>,
  date: Date,
): PublicDayStatus {
  return days[ymd(date)] ?? "available";
}

function isBetweenInclusive(
  date: Date,
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start || !end) return false;
  const t = startOfDay(date).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

export function MediaAvailabilityCalendar({
  mediaId,
  mediaName,
  userPrefill,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const t = useTranslations("mediaDetail.availability");
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [data, setData] = useState<MonthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const month = monthKey(viewMonth);
      const res = await fetch(
        `/api/media/${encodeURIComponent(mediaId)}/availability?month=${month}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as MonthPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mediaId, viewMonth]);

  useEffect(() => {
    void fetchMonth();
  }, [fetchMonth]);

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const days = data?.days ?? {};
  const canGoBack =
    viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward =
    viewMonth <
    new Date(today.getFullYear(), today.getMonth() + MAX_FORWARD_MONTHS, 1);

  const isCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() &&
    viewMonth.getMonth() === today.getMonth();

  const stats = useMemo(() => {
    let available = 0;
    let booked = 0;
    let reserved = 0;
    for (const cell of cells) {
      if (!cell || cell.date < today) continue;
      const s = statusForDay(days, cell.date);
      if (s === "booked") booked++;
      else if (s === "reserved") reserved++;
      else available++;
    }
    return { available, booked, reserved };
  }, [cells, days, today]);

  const blockedRanges = useMemo(() => {
    const ranges: { start: string; end: string }[] = [];
    let runStart: string | null = null;
    let runEnd: string | null = null;
    for (const key of Object.keys(days).sort()) {
      if (days[key] !== "booked") {
        if (runStart && runEnd) {
          ranges.push({
            start: `${runStart}T00:00:00.000Z`,
            end: `${runEnd}T23:59:59.999Z`,
          });
        }
        runStart = null;
        runEnd = null;
        continue;
      }
      if (!runStart) {
        runStart = key;
        runEnd = key;
      } else {
        runEnd = key;
      }
    }
    if (runStart && runEnd) {
      ranges.push({
        start: `${runStart}T00:00:00.000Z`,
        end: `${runEnd}T23:59:59.999Z`,
      });
    }
    return ranges;
  }, [days]);

  const onDayClick = (date: Date) => {
    if (date < today) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
      return;
    }
    setRangeEnd(date);
  };

  const rangeLabel =
    rangeStart && rangeEnd
      ? `${ymd(rangeStart)} — ${ymd(rangeEnd)}`
      : rangeStart
        ? ymd(rangeStart)
        : null;

  const inquiryHref =
    rangeStart && rangeEnd
      ? {
          pathname: "/contact" as const,
          query: {
            media: mediaId,
            mediaName,
            from: ymd(rangeStart),
            to: ymd(rangeEnd),
          },
        }
      : rangeStart
        ? {
            pathname: "/contact" as const,
            query: {
              media: mediaId,
              mediaName,
              from: ymd(rangeStart),
              to: ymd(rangeStart),
            },
          }
        : null;

  const weekdays =
 ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <section
      aria-labelledby="availability-calendar-heading"
      className="mt-10 border-t-2 border-border pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {t("eyebrow")} ]
          </p>
          <h2
            id="availability-calendar-heading"
            className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            <CalendarDays
              className="mr-2 inline-block h-5 w-5 text-accent"
              aria-hidden
            />
            {t("title")}
          </h2>
          <p className="mt-1 max-w-xl font-mono text-[11px] tracking-tight text-muted-foreground">
            {`// `}
            {t("desc")}
          </p>
        </div>

        {/* 월 네비게이션 */}
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
          <span className="min-w-[96px] text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
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

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-[24px] border border-border/80 bg-muted/40 px-4 py-12 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground shadow-xs backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : error ? (
          <p className="rounded-[22px] border border-accent/60 bg-card/80 px-4 py-3 font-mono text-[11px] tracking-tight text-accent shadow-xs backdrop-blur">
            {`// `}
            {t("error")}
          </p>
        ) : (
          <>
            {/* 모바일: 가로 스크롤 가능, 데스크탑: max-width로 컴팩트 */}
            <div className="overflow-x-auto">
              <div className="mx-auto w-full min-w-[300px] max-w-md sm:max-w-lg">
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {weekdays.map((d, i) => (
                    <div
                      key={d}
                      className={`font-mono text-[8px] font-black uppercase tracking-[0.2em] ${
                        i === 6
                          ? "text-accent"
                          : i === 5
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-7 gap-1">
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={idx} className="aspect-square min-h-[36px]" />;
                    }
                    const isPast = cell.date < today;
                    const isToday = cell.date.getTime() === today.getTime();
                    const dayStatus = isPast
                      ? ("past" as const)
                      : statusForDay(days, cell.date);
                    const inRange = isBetweenInclusive(
                      cell.date,
                      rangeStart,
                      rangeEnd,
                    );
                    const label =
                      dayStatus === "past"
                        ? t("dayPast")
                        : dayStatus === "booked"
                          ? t("dayBooked")
                          : dayStatus === "reserved"
                            ? t("dayReserved")
                            : t("dayAvailable");

                    let cls =
                      "relative flex aspect-square min-h-[36px] items-center justify-center rounded-[10px] border text-[11px] font-black tabular-nums transition-colors sm:min-h-[40px]";
                    if (dayStatus === "past") {
                      cls +=
                        " cursor-default border-transparent bg-transparent text-muted-foreground/40";
                    } else {
                      cls += " cursor-pointer";
                      if (dayStatus === "booked") {
                        cls +=
                          " border-red-500/70 bg-red-500/15 text-red-700 dark:text-red-300";
                      } else if (dayStatus === "reserved") {
                        cls +=
                          " border-amber-500/70 bg-amber-400/20 text-amber-900 dark:text-amber-200";
                      } else {
                        cls +=
                          " border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
                      }
                    }
                    if (isToday) cls += " ring-1 ring-foreground/70 ring-offset-1";
                    if (inRange) cls += " ring-2 ring-foreground ring-offset-1";

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isPast}
                        onClick={() => onDayClick(cell.date)}
                        className={cls}
                        aria-label={`${ymd(cell.date)} — ${label}`}
                        title={label}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded border border-emerald-600/50 bg-emerald-500/20" />
                {t("legendAvailable")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded border border-red-500/70 bg-red-500/15" />
                {t("legendBooked")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded border border-amber-500/70 bg-amber-400/20" />
                {t("legendReserved")}
              </span>
              {isCurrentMonth ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded border border-border ring-1 ring-foreground ring-offset-1" />
                  {t("legendToday")}
                </span>
              ) : null}
            </div>

            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              {t("rangeHint")}
            </p>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-[12.5px] leading-relaxed text-foreground">
                <p>
                  {t("statsAvailable", { n: stats.available })}
                  {stats.booked > 0
                    ? ` · ${t("statsBooked", { n: stats.booked })}`
                    : null}
                  {stats.reserved > 0
                    ? ` · ${t("statsReserved", { n: stats.reserved })}`
                    : null}
                </p>
                {rangeLabel ? (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                    {t("rangeSelected", { range: rangeLabel })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {inquiryHref ? (
                  <Link
                    href={inquiryHref}
                    className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-foreground bg-foreground px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90"
                  >
                    {t("ctaInquiryPeriod")}
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-[14px] border border-border/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("ctaSelectRange")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[14px] border border-accent bg-accent px-3.5 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground transition-colors hover:opacity-95"
                >
                  {t("ctaRequest")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <BookingRequestModal
        open={modalOpen}
        mediaId={mediaId}
        mediaName={mediaName}
        blockedRanges={blockedRanges}
        prefill={userPrefill}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void fetchMonth()}
      />
    </section>
  );
}
