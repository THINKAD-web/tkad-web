"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { BookingRequestModal } from "@/components/media-detail/booking-request-modal";

type Props = {
  mediaId: string;
  /** 매체 이름 (모달 헤더 노출용) */
  mediaName: string;
  /** 가입 사용자 prefill (선택) */
  userPrefill?: { name?: string; email?: string };
};

type BlockedRange = {
  start: string; // ISO
  end: string; // ISO
  status: "blocked";
};

type AvailabilityResponse = {
  mediaId: string;
  from: string;
  to: string;
  blockedRanges: BlockedRange[];
};

/** 매체별 ±3개월 한계 — API 의 MAX_LOOKAHEAD_DAYS(180) 와 정렬 */
const MAX_FORWARD_MONTHS = 3;
/** 과거는 보여주지 않음 (예약 의미 없음) */
const MAX_BACKWARD_MONTHS = 0;

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

function dayIsBlocked(date: Date, blocked: BlockedRange[]): boolean {
  // 해당 날짜의 [00:00, 다음날 00:00) 와 blocked range 가 오버랩되는지
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return blocked.some((r) => {
    const rStart = new Date(r.start);
    const rEnd = new Date(r.end);
    return rStart < dayEnd && rEnd > dayStart;
  });
}

export function MediaAvailabilityCalendar({
  mediaId,
  mediaName,
  userPrefill,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const t = useTranslations("mediaDetail.availability");
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 한 번에 ±3개월 fetch — 좌우 이동 시 재요청 회피 (네트워크/캐시 효율)
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
        const url = `/api/public/media/${encodeURIComponent(mediaId)}/availability?from=${ymd(fromD)}&to=${ymd(toD)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
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
  }, [mediaId, today, refreshTick]);

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const blockedRanges = useMemo(() => data?.blockedRanges ?? [], [data]);
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

  // 월 단위 가용 일수 카운트 (CTA 카피용)
  const stats = useMemo(() => {
    let blockedDays = 0;
    let totalFutureDays = 0;
    for (const cell of cells) {
      if (!cell) continue;
      if (cell.date < today) continue;
      totalFutureDays++;
      if (dayIsBlocked(cell.date, blockedRanges)) blockedDays++;
    }
    return { blockedDays, availableDays: totalFutureDays - blockedDays, totalFutureDays };
  }, [cells, blockedRanges, today]);

  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <section
      aria-labelledby="availability-calendar-heading"
      className="mt-12 border-t border-border/70 pt-12"
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
              <div className="mx-auto min-w-[320px] max-w-[360px]">
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
                <div className="mt-1.5 grid grid-cols-7 gap-[3px]">
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={idx} className="aspect-square" />;
                    }
                    const isPast = cell.date < today;
                    const isToday =
                      cell.date.getTime() === today.getTime();
                    const blocked = !isPast && dayIsBlocked(cell.date, blockedRanges);

                    let cls =
                      "relative flex aspect-square items-center justify-center rounded-[10px] border text-[11px] font-black tabular-nums transition-colors";
                    if (isPast) {
                      cls +=
                        " border-transparent bg-transparent text-muted-foreground/40";
                    } else if (blocked) {
                      cls +=
                        " border-accent bg-accent/15 text-accent";
                    } else {
                      cls += " border-border bg-card/80 text-foreground";
                    }
                    if (isToday) {
                      cls += " ring-1 ring-foreground/70 ring-offset-1";
                    }

                    return (
                      <div
                        key={idx}
                        className={cls}
                        aria-label={
                          blocked
                            ? `${ymd(cell.date)} — ${t("dayBlocked")}`
                            : isPast
                              ? undefined
                              : `${ymd(cell.date)} — ${t("dayAvailable")}`
                        }
                        title={
                          blocked
                            ? t("dayBlocked")
                            : isPast
                              ? t("dayPast")
                              : t("dayAvailable")
                        }
                      >
                        <span>{cell.day}</span>
                        {blocked ? (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_45%,rgba(255,102,0,0.45)_45%,rgba(255,102,0,0.45)_55%,transparent_55%)]"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 범례 + 통계 + CTA */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 border border-border bg-card" />
                {t("legendAvailable")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 border border-accent bg-accent/15" />
                {t("legendBlocked")}
              </span>
              {isCurrentMonth ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border border-border ring-1 ring-foreground ring-offset-1" />
                  {t("legendToday")}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/15 pt-3">
              <p className="text-[12.5px] leading-relaxed text-foreground">
                {t("statsAvailable", { n: stats.availableDays })}
                {stats.blockedDays > 0
                  ? `  ·  ${t("statsBlocked", { n: stats.blockedDays })}`
                  : null}
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-[14px] border border-accent bg-accent px-3.5 py-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-accent-foreground transition-colors hover:opacity-95"
              >
                {t("ctaRequest")}
              </button>
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
        onSuccess={() => {
          // 신청 완료 → 캘린더는 변하지 않지만 (requested 비공개), 사용자에게 피드백
          // 후속: 캘린더 위젯 위에 "신청 접수됨" 배너 띄우거나 토스트
          setRefreshTick((n) => n + 1);
        }}
      />
    </section>
  );
}
